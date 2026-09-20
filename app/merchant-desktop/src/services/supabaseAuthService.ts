/**
 * AutoPrint Supabase Authentication Service (Phase 1)
 *
 * Implements email/password authentication, session persistence, profile retrieval,
 * and secure merchant/store setup via Supabase client.
 */

import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';
import type { Profile, Merchant, Store, MerchantRole } from '../types/database.types';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface UserMerchantMembership {
  merchant: Merchant;
  role: MerchantRole;
  stores: Store[];
}

export interface AuthResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Normalizes Supabase auth errors into friendly, safe, user-facing error messages.
 */
export function formatAuthError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const message: string = err.message || err.error_description || String(err);
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (lower.includes('user already registered') || lower.includes('email already in use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Password is too weak. Please provide a password with at least 8 characters.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before logging in, or contact your administrator.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network connectivity error. Could not connect to Supabase authentication server.';
  }

  return message.length < 120 ? message : 'Authentication service error. Please try again.';
}

export class SupabaseAuthService {
  /**
   * Registers a new merchant user via Supabase email/password auth.
   */
  public static async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthResult<{ user: User; session: Session | null }>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase cloud authentication is not configured in this environment.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            phone: params.phone?.trim() || null,
          },
        },
      });

      if (error) {
        return { success: false, error: formatAuthError(error), code: error.code };
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed. No user was returned.' };
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
        },
      };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Signs in an existing user with email and password.
   */
  public static async signIn(params: {
    email: string;
    password: string;
  }): Promise<AuthResult<{ user: User; session: Session }>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase cloud authentication is not configured in this environment.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.trim(),
        password: params.password,
      });

      if (error) {
        return { success: false, error: formatAuthError(error), code: error.code };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Sign in succeeded but active session could not be established.' };
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
        },
      };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Signs out the current user and clears persisted session credentials.
   */
  public static async signOut(): Promise<AuthResult> {
    const supabase = getSupabase();
    if (!supabase) return { success: true };

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: formatAuthError(error) };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Retrieves the current authenticated session.
   */
  public static async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the current authenticated user.
   */
  public static async getUser(): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the user's profile from public.profiles table.
   */
  public static async getProfile(userId: string): Promise<Profile | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch user profile:', error.message);
        return null;
      }

      return data as Profile | null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all merchants and stores where the user has active membership.
   */
  public static async getUserMerchants(): Promise<UserMerchantMembership[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    try {
      // 1. Get memberships for the user
      const { data: rawMembers, error: mErr } = await supabase
        .from('merchant_members')
        .select('merchant_id, role');

      if (mErr || !rawMembers || rawMembers.length === 0) {
        return [];
      }

      const members = rawMembers as unknown as Array<{ merchant_id: string; role: MerchantRole }>;
      const merchantIds = members.map((m) => m.merchant_id);

      // 2. Fetch merchants & stores
      const [merchantsRes, storesRes] = await Promise.all([
        supabase.from('merchants').select('*').in('id', merchantIds),
        supabase.from('stores').select('*').in('merchant_id', merchantIds),
      ]);

      if (merchantsRes.error || !merchantsRes.data) {
        return [];
      }

      const allStores = (storesRes.data || []) as Store[];
      const results: UserMerchantMembership[] = [];

      for (const mRow of (merchantsRes.data as Merchant[])) {
        const mem = members.find((x) => x.merchant_id === mRow.id);
        const stores = allStores.filter((s) => s.merchant_id === mRow.id);
        results.push({
          merchant: mRow,
          role: (mem?.role as MerchantRole) || 'merchant_staff',
          stores,
        });
      }

      return results;
    } catch (err) {
      console.warn('Error fetching user merchants:', err);
      return [];
    }
  }

  /**
   * Creates a new merchant profile, sets the creator as owner, and sets up the primary store.
   */
  public static async createMerchant(params: {
    businessName: string;
    storeName?: string;
    storeAddress?: string;
  }): Promise<AuthResult<{ merchantId: string; storeId: string; businessName: string }>> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    try {
      const { data, error } = await (supabase.rpc as any)('create_merchant', {
        p_business_name: params.businessName.trim(),
        p_store_name: params.storeName?.trim() || 'Main Branch',
        p_store_address: params.storeAddress?.trim() || undefined,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      const resObj = (data || {}) as Record<string, any>;
      return {
        success: true,
        data: {
          merchantId: resObj.merchant_id,
          storeId: resObj.store_id,
          businessName: resObj.business_name,
        },
      };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  /**
   * Subscribes to Supabase authentication state changes.
   */
  public static onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { unsubscribe: () => void } {
    const supabase = getSupabase();
    if (!supabase) {
      return { unsubscribe: () => {} };
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  }
}
