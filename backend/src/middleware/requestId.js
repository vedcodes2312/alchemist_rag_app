import crypto from 'node:crypto';

/**
 * Middleware to assign or forward a unique Request ID for every incoming request.
 */
export function requestId(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const reqId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
