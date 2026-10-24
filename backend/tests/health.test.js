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

  it('GET /openapi.json returns 200 and valid OpenAPI 3.0.3 spec', async () => {
    const res = await request(app).get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openapi', '3.0.3');
    expect(res.body.info).toHaveProperty('title');
    expect(res.body.paths).toHaveProperty('/api/chat');
  });

  it('GET /demo returns 200 with HTML developer playground', async () => {
    const res = await request(app).get('/demo');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('THE ALCHEMIST AI');
  });

  it('GET / redirects to /demo', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/demo');
  });
});

