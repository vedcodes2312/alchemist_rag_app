import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { ragService } from '../src/services/ragService.js';
import { AppError } from '../src/errors/AppError.js';

describe('Chat API Endpoint (/api/chat)', () => {
  it('rejects missing or empty question with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ question: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('requestId');
  });

  it('rejects whitespace-only question with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ question: '    ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects question exceeding max length with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ question: 'a'.repeat(501) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 503 INDEX_NOT_READY when ragService reports index is pending', async () => {
    vi.spyOn(ragService, 'answerQuestion').mockRejectedValueOnce(
      new AppError('INDEX_NOT_READY', 503, 'The book has not been indexed yet.')
    );

    const res = await request(app)
      .post('/api/chat')
      .send({ question: 'Who is Melchizedek?' });

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('INDEX_NOT_READY');
  });

  it('returns 200 with answered payload when question is answered', async () => {
    vi.spyOn(ragService, 'answerQuestion').mockResolvedValueOnce({
      status: 'answered',
      answer: 'Santiago is an Andalusian shepherd boy.',
      interpretation: 'He symbolizes the search for one’s destiny.',
      sources: [
        {
          chunkId: 'the-alchemist-0000-276f73a1',
          chapter: 'Part One',
          pageNumber: null,
          similarity: 0.85,
          excerpt: 'The boy was named Santiago.',
        },
      ],
      meta: {
        model: 'gemini-3-flash-preview',
        retrievalCount: 3,
        usedEvidenceCount: 1,
        warnings: [],
      },
    });

    const res = await request(app)
      .post('/api/chat')
      .send({ question: 'Who is Santiago?' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('answered');
    expect(res.body.answer).toContain('Santiago');
    expect(res.body.sources).toHaveLength(1);
    expect(res.body.sources[0].chapter).toBe('Part One');
  });

  it('returns 200 with insufficient_evidence fallback when unanswerable', async () => {
    vi.spyOn(ragService, 'answerQuestion').mockResolvedValueOnce({
      status: 'insufficient_evidence',
      answer: 'I cannot find support for that in The Alchemist.',
      interpretation: null,
      sources: [],
      meta: {
        model: 'gemini-3-flash-preview',
        retrievalCount: 0,
        usedEvidenceCount: 0,
        warnings: [],
      },
    });

    const res = await request(app)
      .post('/api/chat')
      .send({ question: 'What is rocket science?' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('insufficient_evidence');
    expect(res.body.sources).toEqual([]);
  });
});
