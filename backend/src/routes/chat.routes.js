import { Router } from 'express';
import { z } from 'zod';
import {
  handleChat,
  listSessions,
  getSession,
  deleteSession,
} from '../controllers/chatController.js';
import { chatRateLimiter } from '../middleware/rateLimit.js';
import { validateRequest } from '../middleware/validate.js';
import { env } from '../config/env.js';

const router = Router();

const chatSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .trim()
    .min(1, 'Question cannot be empty')
    .max(
      env.MAX_QUESTION_LENGTH,
      `Question exceeds maximum length of ${env.MAX_QUESTION_LENGTH} characters`
    ),
  sessionId: z.string().uuid().optional(),
  title: z.string().max(100).optional(),
});

// Conversation session management
router.get('/chat/sessions', listSessions);
router.get('/chat/sessions/:id', getSession);
router.delete('/chat/sessions/:id', deleteSession);

// Main chat Q&A endpoint
router.post(
  '/chat',
  chatRateLimiter,
  validateRequest({ body: chatSchema }),
  handleChat
);

export default router;
