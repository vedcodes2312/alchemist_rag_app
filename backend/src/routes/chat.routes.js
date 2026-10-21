import { Router } from 'express';
import { z } from 'zod';
import { handleChat } from '../controllers/chatController.js';
import { chatRateLimiter } from '../middleware/rateLimit.js';
import { validateRequest } from '../middleware/validate.js';
import { env } from '../config/env.js';

const router = Router();

const chatSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .trim()
    .min(1, 'Question cannot be empty')
    .max(env.MAX_QUESTION_LENGTH, `Question exceeds maximum length of ${env.MAX_QUESTION_LENGTH} characters`),
});

router.post(
  '/chat',
  chatRateLimiter,
  validateRequest({ body: chatSchema }),
  handleChat
);

export default router;
