import { env } from '../config/env.js';
import { getSupabaseClient } from '../config/supabaseClient.js';

/**
 * Service for checking book document metadata and index readiness.
 */
export class BookService {
  constructor(options = {}) {
    this.slug = options.slug || env.BOOK_DOCUMENT_SLUG;
  }

  /**
   * Retrieves document status and index readiness from Supabase.
   *
   * @returns {Promise<{ slug: string, title: string, author: string, indexReady: boolean, chunkCount: number, embeddingModel: string, dimension: number, ingestedAt: string | null }>}
   */
  async getBookInfo() {
    let indexReady = false;
    let chunkCount = 0;
    let title = 'The Alchemist';
    let author = 'Paulo Coelho';
    let embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
    let dimension = 384;
    let ingestedAt = null;

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = getSupabaseClient();
        const { data: doc, error } = await supabase
          .from('documents')
          .select('title, author, chunk_count, embedding_model, embedding_dimension, ingested_at')
          .eq('slug', this.slug)
          .maybeSingle();

        if (!error && doc && doc.chunk_count > 0) {
          indexReady = true;
          chunkCount = doc.chunk_count;
          title = doc.title || title;
          author = doc.author || author;
          embeddingModel = doc.embedding_model || embeddingModel;
          dimension = doc.embedding_dimension || dimension;
          ingestedAt = doc.ingested_at || null;
        }
      } catch (_err) {
        // If DB call fails, safely report unready
        indexReady = false;
      }
    }

    return {
      slug: this.slug,
      title,
      author,
      indexReady,
      chunkCount,
      embeddingModel,
      dimension,
      ingestedAt,
    };
  }

  /**
   * Returns true if the index is ready to answer questions.
   */
  async isIndexReady() {
    const info = await this.getBookInfo();
    return info.indexReady;
  }
}

export const bookService = new BookService();
