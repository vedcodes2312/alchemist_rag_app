import { describe, it, expect, vi } from 'vitest';
import { RAGService } from '../../src/services/ragService.js';
import { INSUFFICIENT_EVIDENCE_FALLBACK } from '../../src/prompts/groundedAnswer.js';

describe('RAGService Orchestration', () => {
  it('throws 503 INDEX_NOT_READY when book index is not ready', async () => {
    const mockBook = { isIndexReady: vi.fn().mockResolvedValue(false) };
    const mockRetrieval = { retrieveCandidates: vi.fn() };
    const mockLLM = { generateGroundedAnswer: vi.fn() };

    const service = new RAGService({
      bookService: mockBook,
      retrievalService: mockRetrieval,
      llmService: mockLLM,
    });

    await expect(service.answerQuestion('Who is Santiago?')).rejects.toThrow('The book has not been indexed yet');
    expect(mockRetrieval.retrieveCandidates).not.toHaveBeenCalled();
    expect(mockLLM.generateGroundedAnswer).not.toHaveBeenCalled();
  });

  it('triggers fallback without calling LLM when no candidates meet similarity threshold', async () => {
    const mockBook = { isIndexReady: vi.fn().mockResolvedValue(true) };
    const mockRetrieval = { retrieveCandidates: vi.fn().mockResolvedValue([]) };
    const mockLLM = { generateGroundedAnswer: vi.fn(), modelName: 'gemini-3-flash-preview' };

    const service = new RAGService({
      bookService: mockBook,
      retrievalService: mockRetrieval,
      llmService: mockLLM,
    });

    const result = await service.answerQuestion('What is quantum physics?');

    expect(result.status).toBe('insufficient_evidence');
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_FALLBACK);
    expect(result.sources).toEqual([]);
    expect(mockLLM.generateGroundedAnswer).not.toHaveBeenCalled(); // CRITICAL: 0 LLM calls!
  });

  it('returns answered response with mapped sources ordered by similarity', async () => {
    const mockBook = { isIndexReady: vi.fn().mockResolvedValue(true) };
    const mockCandidates = [
      {
        id: 'the-alchemist-0034-d8c95800',
        chapter: 'Part One',
        pageNumber: null,
        content: '"Well, I\'m the king of Salem!" People say strange things.',
        similarity: 0.65,
      },
      {
        id: 'the-alchemist-0060-c12e4d8c',
        chapter: 'Part One',
        pageNumber: null,
        content: 'The old king had told him that when you want something, the universe conspires.',
        similarity: 0.78,
      },
    ];

    const mockRetrieval = { retrieveCandidates: vi.fn().mockResolvedValue(mockCandidates) };
    const mockLLM = {
      generateGroundedAnswer: vi.fn().mockResolvedValue({
        sufficient: true,
        answer: 'Melchizedek is the King of Salem who guides Santiago.',
        interpretation: 'He represents wise spiritual mentorship.',
        usedEvidence: ['S2', 'S1'],
        warnings: [],
      }),
      modelName: 'gemini-3-flash-preview',
    };

    const service = new RAGService({
      bookService: mockBook,
      retrievalService: mockRetrieval,
      llmService: mockLLM,
    });

    const result = await service.answerQuestion('Who is Melchizedek?');

    expect(result.status).toBe('answered');
    expect(result.answer).toContain('Melchizedek');
    expect(result.interpretation).toContain('mentorship');
    expect(result.sources).toHaveLength(2);
    // Ordered by similarity descending: S2 (0.78) comes before S1 (0.65)
    expect(result.sources[0].similarity).toBe(0.78);
    expect(result.sources[0].chunkId).toBe('the-alchemist-0060-c12e4d8c');
    expect(result.sources[1].similarity).toBe(0.65);
    expect(result.sources[1].chunkId).toBe('the-alchemist-0034-d8c95800');
  });

  it('drops unknown cited labels like S9 and falls back if no valid citations exist', async () => {
    const mockBook = { isIndexReady: vi.fn().mockResolvedValue(true) };
    const mockCandidates = [
      {
        id: 'the-alchemist-0001-11112222',
        chapter: 'Prologue',
        content: 'The alchemist picked up a book.',
        similarity: 0.55,
      },
    ];

    const mockRetrieval = { retrieveCandidates: vi.fn().mockResolvedValue(mockCandidates) };
    // LLM hallucinated citing 'S9' which doesn't exist in evidence
    const mockLLM = {
      generateGroundedAnswer: vi.fn().mockResolvedValue({
        sufficient: true,
        answer: 'Invented answer citing phantom passage.',
        interpretation: null,
        usedEvidence: ['S9'],
        warnings: [],
      }),
      modelName: 'gemini-3-flash-preview',
    };

    const service = new RAGService({
      bookService: mockBook,
      retrievalService: mockRetrieval,
      llmService: mockLLM,
    });

    const result = await service.answerQuestion('Some phantom question');
    // Because S9 is invalid, valid citations = 0, so it falls back to insufficient_evidence
    expect(result.status).toBe('insufficient_evidence');
    expect(result.sources).toEqual([]);
  });
});
