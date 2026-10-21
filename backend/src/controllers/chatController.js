import { AppError } from '../errors/AppError.js';

/**
 * Chat controller handling user questions about The Alchemist.
 * In this initialization phase, it validates requests and reports that the
 * RAG pipeline and book index are pending ingestion in the next phase.
 */
export async function handleChat(req, res, next) {
  try {
    const { question } = req.body;

    // Report that RAG indexing/pipeline is not yet configured
    throw new AppError(
      'INDEX_NOT_READY',
      503,
      'The book has not been indexed yet. The RAG pipeline foundation is established and awaiting the document ingestion phase.'
    );
  } catch (err) {
    next(err);
  }
}
