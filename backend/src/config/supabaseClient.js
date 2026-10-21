import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { AppError } from '../errors/AppError.js';

let supabaseInstance = null;

/**
 * Returns an authenticated Supabase client using the service-role key.
 * Used exclusively on the server.
 */
export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(
      'DATABASE_UNAVAILABLE',
      503,
      'Database credentials are not configured on the server.'
    );
  }

  supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseInstance;
}
