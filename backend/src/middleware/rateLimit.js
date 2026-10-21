import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, _res, next) => {
    next(
      new AppError(
        'RATE_LIMITED',
        429,
        'Too many questions asked in a short period. Please wait a moment before trying again.'
      )
    );
  },
});
