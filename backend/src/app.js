import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './errors/AppError.js';
import healthRoutes from './routes/health.routes.js';
import bookRoutes from './routes/book.routes.js';
import chatRoutes from './routes/chat.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiPath = path.join(__dirname, 'docs', 'openapi.json');
const openapiDocument = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

const app = express();

// Security headers (relaxed contentSecurityPolicy to allow Swagger UI & Demo Playground to render inline assets and fonts)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new AppError('CORS_ERROR', 403, 'Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body parsing with limits
app.use(express.json({ limit: '1mb' }));

// Request ID tracking
app.use(requestId);

// Static assets for Standalone Playground & UI Demo
app.use('/public', express.static(path.join(__dirname, 'public')));

// Root & Demo Routes
app.get('/', (_req, res) => {
  res.redirect('/demo');
});
app.get('/demo', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});
app.get('/playground', (_req, res) => {
  res.redirect('/demo');
});

// OpenAPI Spec & Swagger UI
app.get('/openapi.json', (_req, res) => {
  res.json(openapiDocument);
});
app.get('/docs/openapi.json', (_req, res) => {
  res.json(openapiDocument);
});
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, {
    customSiteTitle: 'The Alchemist AI — Interactive API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, {
    customSiteTitle: 'The Alchemist AI — Interactive API Documentation',
  })
);

// API Routes
app.use('/api', healthRoutes);
app.use('/api/book', bookRoutes);
app.use('/api', chatRoutes);

// Catch-all for undefined routes
app.use((req, _res, next) => {
  next(new AppError('NOT_FOUND', 404, `Cannot ${req.method} ${req.originalUrl}`));
});

// Centralized error handler
app.use(errorHandler);

export default app;

