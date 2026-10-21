import { AppError } from '../errors/AppError.js';
import { bookService } from './bookService.js';
import { retrievalService } from './retrievalService.js';
import { llmService } from './llmService.js';
import { normalizeForEmbedding } from './ingestion/normalize.js';
import { INSUFFICIENT_EVIDENCE_FALLBACK } from '../prompts/groundedAnswer.js';

/**
 * Core RAG Orchestrator coordinating question embedding, semantic retrieval,
 * grounding verification, and structured generation.
 */
export class RAGService {
  constructor(options = {}) {
    this.book = options.bookService || bookService;
    this.retrieval = options.retrievalService || retrievalService;
    this.llm = options.llmService || llmService;
  }

  /**
   * Processes a user question through the complete RAG pipeline.
   *
   * @param {string} rawQuestion - User query text
   * @returns {Promise<{ status: string, answer: string, interpretation: string | null, sources: Array<object>, meta: object }>}
   */
  async answerQuestion(rawQuestion) {
    // 1. Verify index readiness
    const isReady = await this.book.isIndexReady();
    if (!isReady) {
      throw new AppError(
        'INDEX_NOT_READY',
        503,
        'The book has not been indexed yet. Please run the ingestion process before submitting questions.'
      );
    }

    // 2. Canonical query normalization
    const question = normalizeForEmbedding(rawQuestion);

    // 3. Semantic candidate retrieval from Supabase pgvector
    const candidates = await this.retrieval.retrieveCandidates(question);

    // 4. If no candidates meet the similarity threshold, trigger fallback without calling LLM
    if (!candidates || candidates.length === 0) {
      return {
        status: 'insufficient_evidence',
        answer: INSUFFICIENT_EVIDENCE_FALLBACK,
        interpretation: null,
        sources: [],
        meta: {
          model: this.llm.modelName,
          retrievalCount: 0,
          usedEvidenceCount: 0,
          warnings: [],
        },
      };
    }

    // 5. Generate grounded answer via Gemini
    const result = await this.llm.generateGroundedAnswer(question, candidates);

    // 6. Handle model declaration of insufficient evidence
    if (!result.sufficient || result.usedEvidence.length === 0) {
      return {
        status: 'insufficient_evidence',
        answer: INSUFFICIENT_EVIDENCE_FALLBACK,
        interpretation: null,
        sources: [],
        meta: {
          model: this.llm.modelName,
          retrievalCount: candidates.length,
          usedEvidenceCount: 0,
          warnings: result.warnings || [],
        },
      };
    }

    // 7. Map cited labels back to candidate chunk metadata (never trust model-written citations)
    const labelMap = new Map();
    candidates.forEach((c, idx) => {
      labelMap.set(`S${idx + 1}`, c);
    });

    const sources = result.usedEvidence
      .map((label) => labelMap.get(label))
      .filter(Boolean)
      .map((c) => ({
        chunkId: c.id,
        chapter: c.chapter,
        pageNumber: c.pageNumber,
        similarity: c.similarity,
        excerpt: c.content,
      }))
      .sort((a, b) => b.similarity - a.similarity);

    // If no valid citations exist after filtering out unknown labels, trigger fallback
    if (sources.length === 0) {
      return {
        status: 'insufficient_evidence',
        answer: INSUFFICIENT_EVIDENCE_FALLBACK,
        interpretation: null,
        sources: [],
        meta: {
          model: this.llm.modelName,
          retrievalCount: candidates.length,
          usedEvidenceCount: 0,
          warnings: result.warnings || [],
        },
      };
    }

    return {
      status: 'answered',
      answer: result.answer,
      interpretation: result.interpretation,
      sources,
      meta: {
        model: this.llm.modelName,
        retrievalCount: candidates.length,
        usedEvidenceCount: sources.length,
        warnings: result.warnings || [],
      },
    };
  }
}

export const ragService = new RAGService();
