import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health API', () => {
  it('GET /api/health returns 200 and standard health payload', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'alchemist-ai-backend');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.headers).toHaveProperty('x-request-id');
  });

  it('GET /api/book/info returns 200 and document info', async () => {
    const res = await request(app).get('/api/book/info');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('slug', 'the-alchemist');
    expect(res.body).toHaveProperty('dimension', 384);
    expect(res.body).toHaveProperty('indexReady');
  });
});
