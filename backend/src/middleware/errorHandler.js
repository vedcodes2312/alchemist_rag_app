import { AppError } from '../errors/AppError.js';

/**
 * Centralized Express error-handling middleware.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const reqId = req.id || 'unknown';

  let appError;
  if (err instanceof AppError) {
    appError = err;
  } else {
    // Unexpected internal error
    appError = new AppError(
      'INTERNAL_ERROR',
      500,
      'An unexpected internal error occurred. Please try again.',
      { cause: err }
    );
  }

  // Server-side logging only (never return stack traces to clients)
  console.error(`[ERROR] [${reqId}] ${appError.code} (${appError.status}): ${appError.message}`);
  if (appError.cause) {
    console.error(`[ERROR CAUSE]`, appError.cause);
  }

  const responseBody = {
    error: {
      code: appError.code,
      message: appError.safeMessage,
      requestId: reqId,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  res.status(appError.status).json(responseBody);
}
