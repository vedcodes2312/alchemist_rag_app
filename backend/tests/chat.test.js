import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Chat API Validation and Pipeline Status', () => {
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

  it('returns 503 INDEX_NOT_READY for valid question when index is pending', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ question: 'Who is Melchizedek?' });

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('INDEX_NOT_READY');
  });
});
