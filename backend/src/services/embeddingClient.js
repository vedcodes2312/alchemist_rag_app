import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { normalizeForEmbedding } from './ingestion/normalize.js';

const EXPECTED_DIMENSION = 384;

/**
 * Client for interacting with the local Python FastAPI embedding service.
 */
export class EmbeddingClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || env.EMBEDDING_SERVICE_URL;
    this.apiKey = options.apiKey !== undefined ? options.apiKey : env.EMBEDDING_SERVICE_API_KEY;
    this.timeoutMs = options.timeoutMs || env.EMBEDDING_TIMEOUT_MS;
  }

  /**
   * Helper to construct request headers including optional X-API-Key.
   */
  #getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Performs a health check against the embedding service (GET /health).
   *
   * @returns {Promise<{ status: string, model: string, dimension: number }>}
   */
  async checkHealth() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 5000));

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.#getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AppError(
          'EMBEDDING_SERVICE_UNAVAILABLE',
          503,
          `Embedding service health check failed with status ${response.status}`
        );
      }

      const data = await response.json();
      if (data.status !== 'ok' || data.dimension !== EXPECTED_DIMENSION) {
        throw new AppError(
          'INTERNAL_ERROR',
          500,
          `Embedding service health check returned unexpected payload: ${JSON.stringify(data)}`
        );
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        'EMBEDDING_SERVICE_UNAVAILABLE',
        503,
        'Embedding service is unavailable. Please verify the Python service is running on ' + this.baseUrl,
        { cause: err }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generates a single embedding for a query or text string.
   * Applies canonical normalizeForEmbedding prior to sending.
   *
   * @param {string} text
   * @returns {Promise<number[]>} 384-dimensional vector
   */
  async embed(text) {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  /**
   * Generates embeddings for a batch of strings.
   * Applies canonical normalizeForEmbedding to each string prior to sending.
   *
   * @param {string[]} texts
   * @returns {Promise<number[][]>} Array of 384-dimensional vectors
   */
  async embedBatch(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    // Apply the canonical single normalization function
    const normalizedTexts = texts.map((t) => normalizeForEmbedding(t));

    // Reject empty strings if any exist in batch
    for (let i = 0; i < normalizedTexts.length; i++) {
      if (!normalizedTexts[i]) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          `Embedding input text at index ${i} is empty after normalization.`
        );
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: this.#getHeaders(),
        body: JSON.stringify({ texts: normalizedTexts }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new AppError(
          'EMBEDDING_SERVICE_UNAVAILABLE',
          503,
          `Embedding request timed out after ${this.timeoutMs}ms`,
          { cause: err }
        );
      }
      throw new AppError(
        'EMBEDDING_SERVICE_UNAVAILABLE',
        503,
        `Failed to connect to embedding service at ${this.baseUrl}: ${err.message}`,
        { cause: err }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new AppError(
        'EMBEDDING_SERVICE_UNAVAILABLE',
        503,
        `Embedding service returned non-JSON response with HTTP ${response.status}`,
        { cause: err }
      );
    }

    if (!response.ok) {
      const errCode = data?.error?.code || 'EMBEDDING_FAILED';
      const errMsg = data?.error?.message || response.statusText;

      if (response.status === 401) {
        throw new AppError('INTERNAL_ERROR', 500, `Embedding service authentication failed: ${errMsg}`);
      }
      if (response.status === 413) {
        throw new AppError('VALIDATION_ERROR', 400, `Embedding payload exceeds size limit: ${errMsg}`);
      }
      if (response.status === 422) {
        throw new AppError('VALIDATION_ERROR', 400, `Embedding input validation error: ${errMsg}`);
      }
      throw new AppError('EMBEDDING_SERVICE_UNAVAILABLE', 503, `Embedding service error (${errCode}): ${errMsg}`);
    }

    const embeddings = data?.embeddings;
    if (!Array.isArray(embeddings) || embeddings.length !== normalizedTexts.length) {
      throw new AppError(
        'INTERNAL_ERROR',
        500,
        `Embedding service count mismatch: expected ${normalizedTexts.length}, got ${embeddings?.length}`
      );
    }

    // Critical dimension guard: verify length === 384 for every vector
    for (let i = 0; i < embeddings.length; i++) {
      const vector = embeddings[i];
      if (!Array.isArray(vector) || vector.length !== EXPECTED_DIMENSION) {
        throw new AppError(
          'INTERNAL_ERROR',
          500,
          `Embedding dimension check failed for item ${i}: expected ${EXPECTED_DIMENSION}, got ${vector?.length}`
        );
      }
    }

    return embeddings;
  }
}

export const embeddingClient = new EmbeddingClient();
