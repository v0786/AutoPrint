/**
 * AutoPrint Supabase Database Types (Phase 1 Foundation)
 *
 * Defines the core database entities for profiles, merchants, stores, and merchant memberships.
 */

export type MerchantRole = 'merchant_owner' | 'merchant_staff';

export interface Profile {
  id: string; // UUID references auth.users(id)
  full_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string; // UUID
  owner_id: string; // UUID references auth.users(id)
  business_name: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string; // UUID
  merchant_id: string; // UUID references merchants(id)
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantMember {
  id: string; // UUID
  merchant_id: string; // UUID references merchants(id)
  user_id: string; // UUID references auth.users(id)
  role: MerchantRole;
  created_at: string;
  updated_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      merchants: {
        Row: Merchant;
        Insert: {
          id?: string;
          owner_id: string;
          business_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          business_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: Store;
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          address?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stores_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          }
        ];
      };
      merchant_members: {
        Row: MerchantMember;
        Insert: {
          id?: string;
          merchant_id: string;
          user_id: string;
          role: MerchantRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          user_id?: string;
          role?: MerchantRole;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_members_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_merchant: {
        Args: {
          p_business_name: string;
          p_store_name?: string;
          p_store_address?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      merchant_role: MerchantRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
