/**
 * AutoPrint Centralized Supabase Client Module (Phase 1)
 *
 * Provides a singleton Supabase browser client configured with session persistence,
 * auto-token refresh, and strict publishable/anon key enforcement.
 *
 * Security: Service-role keys and database passwords must NEVER be used in browser code.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

let supabaseClientInstance: SupabaseClient<Database> | null = null;

export const supabaseEnv = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '',
  publishableKey: (
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  )?.trim() || '',
};

/**
 * Returns true if both Supabase URL and publishable/anon key are defined.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseEnv.url && supabaseEnv.publishableKey);
}

/**
 * Gets the singleton Supabase client.
 * Returns null if Supabase environment variables are missing (allowing offline V1 operation).
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  // Safety check: ensure service-role key is never accidentally provided
  if (supabaseEnv.publishableKey.includes('service_role')) {
    console.error('CRITICAL SECURITY ERROR: service_role key detected in client environment! Supabase client will not initialize.');
    return null;
  }

  supabaseClientInstance = createClient<Database>(supabaseEnv.url, supabaseEnv.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'autoprint_supabase_auth_token',
    },
  });

  return supabaseClientInstance;
}
