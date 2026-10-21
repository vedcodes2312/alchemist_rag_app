import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`[INFO] Alchemist AI Backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[INFO] Health check available at http://localhost:${env.PORT}/api/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[INFO] HTTP server closed');
  });
});
