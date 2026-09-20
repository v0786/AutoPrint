/**
 * AutoPrint Supabase Authentication Context (Phase 1)
 *
 * Provides a single, reliable source of truth for authentication state, user profile,
 * active merchant identity, and memberships.
 * Guarantees zero "flash of logged-out UI" by awaiting initial session determination.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../lib/supabase/client';
import {
  SupabaseAuthService,
  UserMerchantMembership,
  formatAuthError,
} from '../services/supabaseAuthService';
import type { Profile, Merchant, Store, MerchantRole } from '../types/database.types';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  merchants: UserMerchantMembership[];
  activeMerchant: Merchant | null;
  activeStore: Store | null;
  memberRole: MerchantRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isCloudAuthEnabled: boolean;

  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  createMerchant: (businessName: string, storeName?: string, storeAddress?: string) => Promise<{ success: boolean; error?: string; merchantId?: string }>;
  selectMerchant: (merchantId: string) => void;
  clearError: () => void;
  refreshProfileAndMerchants: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchants, setMerchants] = useState<UserMerchantMembership[]>([]);
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [memberRole, setMemberRole] = useState<MerchantRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isCloudAuthEnabled = isSupabaseConfigured();

  const loadUserData = useCallback(async (currentUserId: string) => {
    try {
      const [userProfile, userMerchants] = await Promise.all([
        SupabaseAuthService.getProfile(currentUserId),
        SupabaseAuthService.getUserMerchants(),
      ]);

      setProfile(userProfile);
      setMerchants(userMerchants);

      if (userMerchants.length > 0) {
        // Default to first merchant
        const first = userMerchants[0];
        setActiveMerchant(first.merchant);
        setMemberRole(first.role);
        setActiveStore(first.stores.length > 0 ? first.stores[0] : null);
      } else {
        setActiveMerchant(null);
        setMemberRole(null);
        setActiveStore(null);
      }
    } catch (err) {
      console.warn('Failed to load user profile or merchant memberships:', err);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    if (!isCloudAuthEnabled) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function initAuth() {
      try {
        const initialSession = await SupabaseAuthService.getSession();
        if (!isMounted) return;

        if (initialSession && initialSession.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          await loadUserData(initialSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setMerchants([]);
          setActiveMerchant(null);
          setActiveStore(null);
          setMemberRole(null);
        }
      } catch (err) {
        console.warn('Initial Supabase auth verification encountered an error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Subscribe to auth events
    const { unsubscribe } = SupabaseAuthService.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!isMounted) return;

        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await loadUserData(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setMerchants([]);
          setActiveMerchant(null);
          setActiveStore(null);
          setMemberRole(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // Keep active user fresh
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isCloudAuthEnabled, loadUserData]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const result = await SupabaseAuthService.signIn({ email, password });
    if (!result.success) {
      const err = result.error || 'Sign in failed.';
      setError(err);
      return { success: false, error: err };
    }

    if (result.data?.session?.user) {
      setSession(result.data.session);
      setUser(result.data.session.user);
      await loadUserData(result.data.session.user.id);
    }

    return { success: true };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    setError(null);
    const result = await SupabaseAuthService.signUp({ email, password, fullName, phone });
    if (!result.success) {
      const err = result.error || 'Sign up failed.';
      setError(err);
      return { success: false, error: err };
    }

    if (result.data?.session?.user) {
      setSession(result.data.session);
      setUser(result.data.session.user);
      await loadUserData(result.data.session.user.id);
    }

    return { success: true };
  };

  const signOut = async () => {
    setError(null);
    await SupabaseAuthService.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setMerchants([]);
    setActiveMerchant(null);
    setActiveStore(null);
    setMemberRole(null);
  };

  const createMerchant = async (businessName: string, storeName?: string, storeAddress?: string) => {
    setError(null);
    const result = await SupabaseAuthService.createMerchant({ businessName, storeName, storeAddress });
    if (!result.success) {
      const err = result.error || 'Failed to create merchant.';
      setError(err);
      return { success: false, error: err };
    }

    if (user) {
      await loadUserData(user.id);
    }

    return { success: true, merchantId: result.data?.merchantId };
  };

  const selectMerchant = (merchantId: string) => {
    const found = merchants.find((m) => m.merchant.id === merchantId);
    if (found) {
      setActiveMerchant(found.merchant);
      setMemberRole(found.role);
      setActiveStore(found.stores.length > 0 ? found.stores[0] : null);
    }
  };

  const clearError = () => setError(null);

  const refreshProfileAndMerchants = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        merchants,
        activeMerchant,
        activeStore,
        memberRole,
        isLoading,
        isAuthenticated: Boolean(user && session),
        error,
        isCloudAuthEnabled,
        signIn,
        signUp,
        signOut,
        createMerchant,
        selectMerchant,
        clearError,
        refreshProfileAndMerchants,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
