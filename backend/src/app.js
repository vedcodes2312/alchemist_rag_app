import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './errors/AppError.js';
import healthRoutes from './routes/health.routes.js';
import bookRoutes from './routes/book.routes.js';
import chatRoutes from './routes/chat.routes.js';

const app = express();

// Security headers
app.use(helmet());

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
