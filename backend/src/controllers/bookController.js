import { env } from '../config/env.js';
import { getSupabaseClient } from '../config/supabaseClient.js';

export async function getBookInfo(req, res, next) {
  try {
    let indexReady = false;
    let chunkCount = 0;
    let title = 'The Alchemist';
    let author = 'Paulo Coelho';

    // If Supabase is configured, check if documents and chunks exist
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = getSupabaseClient();
        const { data: doc } = await supabase
          .from('documents')
          .select('title, author, chunk_count, ingested_at')
          .eq('slug', env.BOOK_DOCUMENT_SLUG)
          .maybeSingle();

        if (doc && doc.chunk_count > 0) {
          indexReady = true;
          chunkCount = doc.chunk_count;
          title = doc.title || title;
          author = doc.author || author;
        }
      } catch (_err) {
        // If query fails, report unready without leaking credentials
        indexReady = false;
      }
    }

    res.status(200).json({
      slug: env.BOOK_DOCUMENT_SLUG,
      title,
      author,
      indexReady,
      chunkCount,
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      dimension: 384,
    });
  } catch (err) {
    next(err);
  }
}
