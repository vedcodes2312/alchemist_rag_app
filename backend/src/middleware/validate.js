import { AppError } from '../errors/AppError.js';

/**
 * Validates request body, query, or params against Zod schemas.
 *
 * @param {object} schemas
 * @param {import('zod').ZodSchema} [schemas.body]
 * @param {import('zod').ZodSchema} [schemas.query]
 * @param {import('zod').ZodSchema} [schemas.params]
 */
export function validateRequest({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const issues = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        return next(
          new AppError('VALIDATION_ERROR', 400, 'Invalid request input', {
            details: issues,
            cause: err,
          })
        );
      }
      next(err);
    }
  };
}
