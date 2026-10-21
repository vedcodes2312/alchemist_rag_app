import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { getSupabaseClient } from '../../config/supabaseClient.js';
import { readSource } from './readSource.js';
import { normalizeSourceText } from './normalize.js';
import { parseSections } from './sectionParser.js';
import { chunkSections } from './chunker.js';
import { embeddingClient } from '../embeddingClient.js';

const BATCH_SIZE = 32;
const EMBEDDING_MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384;

/**
 * Computes token summary statistics for a set of chunks.
 */
function computeStats(chunks) {
  if (chunks.length === 0) {
    return { count: 0, totalTokens: 0, avgTokens: 0, minTokens: 0, maxTokens: 0 };
  }

  let total = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const c of chunks) {
    const t = c.tokenEstimate;
    total += t;
    if (t < min) min = t;
    if (t > max) max = t;
  }

  return {
    count: chunks.length,
    totalTokens: total,
    avgTokens: Math.round(total / chunks.length),
    minTokens: min === Infinity ? 0 : min,
    maxTokens: max === -Infinity ? 0 : max,
  };
}

/**
 * Runs the complete ingestion and indexing pipeline.
 *
 * @param {object} options
 * @param {string} options.filePath - Path to source text file
 * @param {string} [options.title='The Alchemist'] - Book display title
 * @param {string} [options.slug='the-alchemist'] - Document unique slug
 * @param {string} [options.author='Paulo Coelho'] - Book author
 * @param {string} [options.sourceDescription='Authorized text extraction'] - Description
 * @param {boolean} [options.dryRun=false] - Only chunk and calculate stats without DB/embedding
 * @param {boolean} [options.reset=false] - Reset / re-index if already exists
 * @param {function} [options.onProgress] - Callback for batch progress updates
 * @returns {Promise<object>} Summary of the indexing operation
 */
export async function runIngestion(options = {}) {
  const startTime = Date.now();
  const filePath = options.filePath;
  const title = options.title || 'The Alchemist';
  const slug = options.slug || env.BOOK_DOCUMENT_SLUG;
  const author = options.author || 'Paulo Coelho';
  const sourceDescription = options.sourceDescription || 'Authorized text extraction';
  const dryRun = Boolean(options.dryRun);
  const onProgress = options.onProgress || (() => {});

  if (!filePath) {
    throw new AppError('VALIDATION_ERROR', 400, 'Source file path is required for ingestion.');
  }

  // 1. Read source file
  const { rawText } = await readSource(filePath);

  // 2. Normalize source text
  const normalizedText = normalizeSourceText(rawText);
  const sourceSha256 = crypto.createHash('sha256').update(normalizedText).digest('hex');

  // 3. Parse markdown sections
  const sections = parseSections(normalizedText);

  // 4. Generate structured chunks
  const chunks = chunkSections(sections, {
    slug,
    targetTokens: env.CHUNK_TARGET_TOKENS,
    overlapTokens: env.CHUNK_OVERLAP_TOKENS,
  });

  const stats = computeStats(chunks);

  if (dryRun) {
    return {
      dryRun: true,
      slug,
      title,
      author,
      sourceSha256,
      sectionsCount: sections.length,
      chunksCount: chunks.length,
      tokenStats: stats,
      durationMs: Date.now() - startTime,
    };
  }

  // 5. Connect to Supabase
  const supabase = getSupabaseClient();

  // Step A: Upsert document row with chunk_count = 0 (Index not ready during indexing)
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .upsert(
      {
        slug,
        title,
        author,
        source_description: sourceDescription,
        source_sha256: sourceSha256,
        embedding_model: EMBEDDING_MODEL_NAME,
        embedding_dimension: EMBEDDING_DIMENSION,
        chunk_count: 0,
        ingested_at: null,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();

  if (docError || !doc) {
    throw new AppError(
      'DATABASE_UNAVAILABLE',
      503,
      `Failed to upsert document row in Supabase: ${docError?.message || 'Unknown DB error'}`
    );
  }

  // Step B: Delete previous chunks for this document
  const { error: deleteError } = await supabase
    .from('chunks')
    .delete()
    .eq('document_id', doc.id);

  if (deleteError) {
    throw new AppError(
      'DATABASE_UNAVAILABLE',
      503,
      `Failed to clear previous chunks: ${deleteError.message}`
    );
  }

  // Step C: Embed and insert in batches of 32
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE;
    const batch = chunks.slice(start, start + BATCH_SIZE);

    onProgress({
      phase: 'embedding',
      batchIndex: batchIdx + 1,
      totalBatches,
      currentChunk: start + batch.length,
      totalChunks: chunks.length,
    });

    const textsToEmbed = batch.map((c) => c.content);
    let embeddings;
    try {
      embeddings = await embeddingClient.embedBatch(textsToEmbed);
    } catch (err) {
      throw new AppError(
        'EMBEDDING_SERVICE_UNAVAILABLE',
        503,
        `Ingestion aborted: embedding failed on batch ${batchIdx + 1}/${totalBatches}: ${err.message}`,
        { cause: err }
      );
    }

    const rows = batch.map((c, i) => ({
      id: c.id,
      document_id: doc.id,
      chunk_index: c.chunkIndex,
      chapter: c.chapter,
      chapter_index: c.chapterIndex,
      page_number: c.pageNumber ?? null,
      content: c.content,
      token_estimate: c.tokenEstimate,
      char_start: c.charStart,
      char_end: c.charEnd,
      embedding: embeddings[i],
      metadata: c.metadata ?? {},
    }));

    onProgress({
      phase: 'writing_db',
      batchIndex: batchIdx + 1,
      totalBatches,
      currentChunk: start + batch.length,
      totalChunks: chunks.length,
    });

    const { error: insertError } = await supabase.from('chunks').insert(rows);
    if (insertError) {
      throw new AppError(
        'DATABASE_UNAVAILABLE',
        503,
        `Ingestion aborted: database insert failed on batch ${batchIdx + 1}/${totalBatches}: ${insertError.message}`
      );
    }
  }

  // Step D: Mark document as ready by updating chunk_count and ingested_at
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      chunk_count: chunks.length,
      ingested_at: new Date().toISOString(),
    })
    .eq('id', doc.id);

  if (updateError) {
    throw new AppError(
      'DATABASE_UNAVAILABLE',
      503,
      `Failed to mark document ready after chunk insertion: ${updateError.message}`
    );
  }

  return {
    success: true,
    documentId: doc.id,
    slug,
    title,
    author,
    sourceSha256,
    sectionsCount: sections.length,
    chunksCount: chunks.length,
    tokenStats: stats,
    durationMs: Date.now() - startTime,
  };
}
