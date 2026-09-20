/**
 * AutoPrint Supabase device client.
 *
 * The Merchant Agent intentionally uses a restricted publishable/anon key plus
 * a device access token. It never accepts a privileged project key, so a
 * packaged merchant installation cannot bypass RLS for another merchant.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseAdminClient {
  private static instance: SupabaseClient | null = null;
  private static readonly BUCKET_NAME = 'print-documents';

  /**
   * Initializes or returns the cached Supabase client
   */
  public static getClient(): SupabaseClient | null {
    if (this.instance) return this.instance;

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const deviceToken = process.env.SUPABASE_DEVICE_ACCESS_TOKEN || '';
    this.instance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: deviceToken ? { headers: { Authorization: `Bearer ${deviceToken}` } } : undefined,
    });

    return this.instance;
  }

  /**
   * Checks if Supabase credentials are configured
   */
  public static isConfigured(): boolean {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
    return Boolean(supabaseUrl && supabaseKey);
  }

  /**
   * Returns the Supabase Storage bucket for documents
   */
  public static getStorageBucketName(): string {
    return process.env.SUPABASE_STORAGE_BUCKET || this.BUCKET_NAME;
  }

  /**
   * Resets the singleton instance (used in tests)
   */
  public static reset(): void {
    this.instance = null;
  }
}
