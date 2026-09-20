-- ===============================================================================
-- AutoPrint Phase 1 Foundation Migration
-- Tables: profiles, merchants, stores, merchant_members
-- Automatic Profile Trigger, Secure Merchant Creation RPC, and Hardened RLS
-- ===============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------------
-- 2. MERCHANTS TABLE
-- -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    business_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure owner_id & business_name columns exist if merchants table pre-existed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.merchants ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = 'business_name'
    ) THEN
        ALTER TABLE public.merchants ADD COLUMN business_name TEXT NOT NULL DEFAULT 'AutoPrint Print Shop';
    END IF;
END $$;

-- -------------------------------------------------------------------------------
-- 3. STORES TABLE
-- -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------------
-- 4. MERCHANT MEMBERS TABLE
-- -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('merchant_owner', 'merchant_staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_merchant_members_merchant_user UNIQUE (merchant_id, user_id)
);

-- -------------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES (Foreign Keys & RLS Predicates)
-- -------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_merchants_owner_id ON public.merchants (owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_merchant_id ON public.stores (merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_members_merchant_id ON public.merchant_members (merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_members_user_id ON public.merchant_members (user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_members_lookup ON public.merchant_members (merchant_id, user_id, role);

-- -------------------------------------------------------------------------------
-- 6. AUTOMATIC PROFILE CREATION TRIGGER (auth.users -> public.profiles)
-- -------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------------------------
-- 7. SECURE MERCHANT & DEFAULT STORE CREATION RPC
-- -------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_merchant(
    p_business_name TEXT,
    p_store_name TEXT DEFAULT 'Main Branch',
    p_store_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_merchant_id UUID;
    v_store_id UUID;
    v_clean_business_name TEXT;
    v_clean_store_name TEXT;
BEGIN
    -- Derive owner strictly from authenticated session
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create a merchant profile.';
    END IF;

    v_clean_business_name := trim(p_business_name);
    IF v_clean_business_name IS NULL OR length(v_clean_business_name) < 2 THEN
        RAISE EXCEPTION 'Business name must be at least 2 characters.';
    END IF;

    v_clean_store_name := trim(COALESCE(p_store_name, 'Main Branch'));
    IF length(v_clean_store_name) = 0 THEN
        v_clean_store_name := 'Main Branch';
    END IF;

    -- 1. Create Merchant
    INSERT INTO public.merchants (owner_id, business_name)
    VALUES (v_user_id, v_clean_business_name)
    RETURNING id INTO v_merchant_id;

    -- 2. Assign Creator as Owner
    INSERT INTO public.merchant_members (merchant_id, user_id, role)
    VALUES (v_merchant_id, v_user_id, 'merchant_owner');

    -- 3. Create Default Store
    INSERT INTO public.stores (merchant_id, name, address)
    VALUES (v_merchant_id, v_clean_store_name, p_store_address)
    RETURNING id INTO v_store_id;

    RETURN jsonb_build_object(
        'merchant_id', v_merchant_id,
        'business_name', v_clean_business_name,
        'store_id', v_store_id,
        'store_name', v_clean_store_name,
        'role', 'merchant_owner'
    );
END;
$$;

-- Grant execution only to authenticated callers
REVOKE EXECUTE ON FUNCTION public.create_merchant(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_merchant(TEXT, TEXT, TEXT) TO authenticated;

-- -------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------

-- 8.1 PROFILES POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- 8.2 MERCHANTS POLICIES
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchants_select_members" ON public.merchants;
CREATE POLICY "merchants_select_members"
ON public.merchants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchant_members
        WHERE merchant_members.merchant_id = merchants.id
          AND merchant_members.user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "merchants_update_owner" ON public.merchants;
CREATE POLICY "merchants_update_owner"
ON public.merchants FOR UPDATE
TO authenticated
USING ((select auth.uid()) = owner_id)
WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "merchants_insert_own" ON public.merchants;
CREATE POLICY "merchants_insert_own"
ON public.merchants FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = owner_id);

-- 8.3 STORES POLICIES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select_members" ON public.stores;
CREATE POLICY "stores_select_members"
ON public.stores FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchant_members
        WHERE merchant_members.merchant_id = stores.merchant_id
          AND merchant_members.user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "stores_insert_owner" ON public.stores;
CREATE POLICY "stores_insert_owner"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.merchant_members
        WHERE merchant_members.merchant_id = stores.merchant_id
          AND merchant_members.user_id = (select auth.uid())
          AND merchant_members.role = 'merchant_owner'
    )
);

DROP POLICY IF EXISTS "stores_update_owner" ON public.stores;
CREATE POLICY "stores_update_owner"
ON public.stores FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchant_members
        WHERE merchant_members.merchant_id = stores.merchant_id
          AND merchant_members.user_id = (select auth.uid())
          AND merchant_members.role = 'merchant_owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.merchant_members
        WHERE merchant_members.merchant_id = stores.merchant_id
          AND merchant_members.user_id = (select auth.uid())
          AND merchant_members.role = 'merchant_owner'
    )
);

DROP POLICY IF EXISTS "stores_delete_owner" ON public.stores;
CREATE POLICY "stores_delete_owner"
ON public.stores FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchant_members
        WHERE merchant_members.merchant_id = stores.merchant_id
          AND merchant_members.user_id = (select auth.uid())
          AND merchant_members.role = 'merchant_owner'
    )
);

-- 8.4 MERCHANT MEMBERS POLICIES
ALTER TABLE public.merchant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchant_members_select" ON public.merchant_members;
CREATE POLICY "merchant_members_select"
ON public.merchant_members FOR SELECT
TO authenticated
USING (
    user_id = (select auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.merchant_members m2
        WHERE m2.merchant_id = merchant_members.merchant_id
          AND m2.user_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS "merchant_members_insert_owner" ON public.merchant_members;
CREATE POLICY "merchant_members_insert_owner"
ON public.merchant_members FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.merchant_members m_owner
        WHERE m_owner.merchant_id = merchant_members.merchant_id
          AND m_owner.user_id = (select auth.uid())
          AND m_owner.role = 'merchant_owner'
    )
);

DROP POLICY IF EXISTS "merchant_members_update_owner" ON public.merchant_members;
CREATE POLICY "merchant_members_update_owner"
ON public.merchant_members FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchant_members m_owner
        WHERE m_owner.merchant_id = merchant_members.merchant_id
          AND m_owner.user_id = (select auth.uid())
          AND m_owner.role = 'merchant_owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.merchant_members m_owner
        WHERE m_owner.merchant_id = merchant_members.merchant_id
          AND m_owner.user_id = (select auth.uid())
          AND m_owner.role = 'merchant_owner'
    )
);

DROP POLICY IF EXISTS "merchant_members_delete_owner" ON public.merchant_members;
CREATE POLICY "merchant_members_delete_owner"
ON public.merchant_members FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchant_members m_owner
        WHERE m_owner.merchant_id = merchant_members.merchant_id
          AND m_owner.user_id = (select auth.uid())
          AND m_owner.role = 'merchant_owner'
    )
);
