/**
 * Alchemist AI — Standard Application Error
 * Encapsulates error code, HTTP status, client-safe message, and internal causes.
 */
export class AppError extends Error {
  /**
   * @param {string} code - Stable error code (e.g. 'VALIDATION_ERROR', 'INDEX_NOT_READY')
   * @param {number} status - HTTP status code (e.g. 400, 429, 503)
   * @param {string} safeMessage - Client-safe message free of secrets and internals
   * @param {object} [options]
   * @param {unknown} [options.cause] - Original error or internal cause (server-logged only)
   * @param {unknown} [options.details] - Safe structured details (e.g. validation issues)
   */
  constructor(code, status, safeMessage, options = {}) {
    super(safeMessage);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.safeMessage = safeMessage;
    this.cause = options.cause;
    this.details = options.details;
  }
}
