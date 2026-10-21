import { env } from '../config/env.js';

export async function getHealth(req, res, next) {
  try {
    const isDeep = req.query.deep === 'true';

    const response = {
      status: 'ok',
      service: 'alchemist-ai-backend',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    if (isDeep) {
      const checks = {
        embeddingService: 'unknown',
        database: 'unknown',
      };

      // Check embedding service
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const embRes = await fetch(`${env.EMBEDDING_SERVICE_URL}/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        checks.embeddingService = embRes.ok ? 'connected' : `http_${embRes.status}`;
      } catch (err) {
        checks.embeddingService = `unavailable: ${err.message}`;
      }

      // Check Supabase database config
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        checks.database = 'configured';
      } else {
        checks.database = 'unconfigured';
      }

      response.checks = checks;
    }

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}
