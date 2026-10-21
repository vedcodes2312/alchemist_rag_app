import { describe, it, expect } from 'vitest';
import { embeddingClient } from '../../src/services/embeddingClient.js';

describe('EmbeddingClient', () => {
  it('connects to health endpoint and confirms dimension 384', async () => {
    const health = await embeddingClient.checkHealth();
    expect(health.status).toBe('ok');
    expect(health.dimension).toBe(384);
    expect(health.model).toBe('sentence-transformers/all-MiniLM-L6-v2');
  });

  it('generates a 384-dimensional embedding for a single text', async () => {
    const vector = await embeddingClient.embed('Santiago looked at the desert horizon.');
    expect(Array.isArray(vector)).toBe(true);
    expect(vector).toHaveLength(384);
    expect(typeof vector[0]).toBe('number');
  });

  it('generates embeddings for a batch of texts preserving order and dimension', async () => {
    const texts = [
      'The boy followed the omen.',
      'The king spoke of the Personal Legend.',
      'The alchemist waited at the oasis.',
    ];
    const embeddings = await embeddingClient.embedBatch(texts);
    expect(embeddings).toHaveLength(3);
    for (const vec of embeddings) {
      expect(vec).toHaveLength(384);
    }
  });

  it('rejects an empty batch with an empty array without making network calls', async () => {
    const result = await embeddingClient.embedBatch([]);
    expect(result).toEqual([]);
  });

  it('rejects empty or whitespace-only text with 400 VALIDATION_ERROR', async () => {
    await expect(embeddingClient.embed('   ')).rejects.toThrow('Embedding input text at index 0 is empty');
  });
});
