import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { getSupabaseClient } from '../config/supabaseClient.js';
import { embeddingClient } from './embeddingClient.js';

/**
 * Service for retrieving semantically relevant text chunks from Supabase pgvector.
 */
export class RetrievalService {
  constructor(options = {}) {
    this.topK = options.topK || env.RETRIEVAL_TOP_K;
    this.threshold = options.threshold !== undefined ? options.threshold : env.SIMILARITY_THRESHOLD;
    this.slug = options.slug || env.BOOK_DOCUMENT_SLUG;
    this.maxExcerptChars = options.maxExcerptChars || env.MAX_EXCERPT_CHARS;
  }

  /**
   * Retrieves book chunks relevant to a user question.
   *
   * 1. Embeds the question using local Python service.
   * 2. Calls Supabase match_chunks RPC.
   * 3. Discards candidates below similarity threshold.
   * 4. Caps excerpts to maxExcerptChars.
   *
   * @param {string} question - Clean user query
   * @param {object} [options]
   * @param {number[]} [options.queryEmbedding] - Precomputed embedding (optional)
   * @param {number} [options.matchCount] - Number of candidates to request
   * @returns {Promise<Array<{ id: string, chapter: string | null, pageNumber: number | null, content: string, similarity: number }>>}
   */
  async retrieveCandidates(question, options = {}) {
    const matchCount = options.matchCount || this.topK;
    const slug = options.slug || this.slug;

    // 1. Obtain query embedding
    let queryEmbedding = options.queryEmbedding;
    if (!queryEmbedding) {
      queryEmbedding = await embeddingClient.embed(question);
    }

    // 2. Query Supabase RPC
    const supabase = getSupabaseClient();
    let data;
    try {
      const result = await supabase.rpc('match_chunks', {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        filter_document_slug: slug,
      });

      if (result.error) {
        throw new AppError(
          'DATABASE_UNAVAILABLE',
          503,
          `Failed to retrieve chunks from database: ${result.error.message}`,
          { cause: result.error }
        );
      }
      data = result.data || [];
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        'DATABASE_UNAVAILABLE',
        503,
        `Database retrieval query failed: ${err.message}`,
        { cause: err }
      );
    }

    // 3. Node-side threshold filtering and score inspection
    const qualified = [];
    for (const item of data) {
      const similarity = Number(item.similarity) || 0;
      if (similarity >= this.threshold) {
        // Enforce excerpt character cap
        const content = item.content.length > this.maxExcerptChars
          ? item.content.slice(0, this.maxExcerptChars).trim() + '...'
          : item.content;

        qualified.push({
          id: item.id,
          chapter: item.chapter ?? null,
          pageNumber: item.page_number ?? null,
          content,
          similarity: Math.round(similarity * 1000) / 1000,
        });
      }
    }

    return qualified;
  }
}

export const retrievalService = new RetrievalService();
