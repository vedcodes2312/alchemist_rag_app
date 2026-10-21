import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Supabase (server-only)
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),

  // Gemini (server-only)
  GEMINI_API_KEY: z.string().optional().or(z.literal('')),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),

  // Python Embedding Service
  EMBEDDING_SERVICE_URL: z.string().url().default('http://127.0.0.1:8001'),
  EMBEDDING_SERVICE_API_KEY: z.string().optional().or(z.literal('')),

  // RAG & Retrieval Parameters
  EMBEDDING_TIMEOUT_MS: z.coerce.number().default(15000),
  LLM_TIMEOUT_MS: z.coerce.number().default(30000),
  RETRIEVAL_TOP_K: z.coerce.number().default(5),
  SIMILARITY_THRESHOLD: z.coerce.number().default(0.30),
  CHUNK_TARGET_TOKENS: z.coerce.number().default(220),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().default(40),
  MAX_QUESTION_LENGTH: z.coerce.number().default(500),
  MAX_EXCERPT_CHARS: z.coerce.number().default(800),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(20),
  BOOK_DOCUMENT_SLUG: z.string().default('the-alchemist'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[CONFIG ERROR] Invalid environment configuration:', parsed.error.format());
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
