/**
 * Alchemist AI — Frontend API Client
 * Wraps fetch requests to the Express backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(code, message, requestId, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

/**
 * Sends a question to the backend chat endpoint.
 *
 * @param {string} question
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>}
 */
export async function askQuestion(question, signal) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError(
      'NETWORK_ERROR',
      'Unable to connect to the library server. Please check your connection.',
      null
    );
  }

  let data;
  try {
    data = await res.json();
  } catch (_err) {
    throw new ApiError(
      'INVALID_RESPONSE',
      'Received an unreadable response from the server.',
      res.headers.get('x-request-id')
    );
  }

  if (!res.ok) {
    const errorPayload = data.error || {};
    throw new ApiError(
      errorPayload.code || 'UNKNOWN_ERROR',
      errorPayload.message || 'An unexpected error occurred.',
      errorPayload.requestId || res.headers.get('x-request-id'),
      errorPayload.details
    );
  }

  return data;
}

/**
 * Fetches book index information.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>}
 */
export async function getBookInfo(signal) {
  try {
    const res = await fetch(`${API_BASE_URL}/book/info`, { signal });
    if (!res.ok) {
      return { indexReady: false, chunkCount: 0 };
    }
    return await res.json();
  } catch (_err) {
    return { indexReady: false, chunkCount: 0 };
  }
}
