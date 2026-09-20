-- ==============================================================================
-- AutoPrint v1 — Complete Supabase PostgreSQL Schema & Storage Migration
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Merchants Table
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    store_name TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Hardware Printers Table
CREATE TABLE IF NOT EXISTS public.printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
    printer_name TEXT NOT NULL,
    system_name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'windows',
    status TEXT NOT NULL DEFAULT 'ONLINE',
    is_default BOOLEAN NOT NULL DEFAULT false,
    capabilities JSONB DEFAULT '{}'::jsonb,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Print Jobs Table (Core Synchronization Entity)
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT UNIQUE NOT NULL,
    job_no TEXT,
    merchant_id TEXT NOT NULL,
    customer_id TEXT NOT NULL DEFAULT 'walk-in-customer',
    
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    
    pages INTEGER NOT NULL DEFAULT 1,
    copies INTEGER NOT NULL DEFAULT 1,
    
    paper_size TEXT NOT NULL DEFAULT 'A4',
    color_mode TEXT NOT NULL DEFAULT 'BW',
    duplex BOOLEAN NOT NULL DEFAULT false,
    orientation TEXT NOT NULL DEFAULT 'PORTRAIT',
    
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    amount_minor_units BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    status TEXT NOT NULL DEFAULT 'UPLOADED',
    
    verification_code TEXT,
    printer_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    
    error_code TEXT,
    error_message TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ,
    printing_at TIMESTAMPTZ,
    printed_at TIMESTAMPTZ,
    ready_for_collection_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Indexes for performant merchant queries & realtime lookups
CREATE INDEX IF NOT EXISTS idx_print_jobs_merchant_status ON public.print_jobs (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_job_id ON public.print_jobs (job_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON public.print_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_jobs_verification_code ON public.print_jobs (verification_code);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.print_jobs(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'RAZORPAY',
    order_id TEXT,
    payment_id TEXT,
    signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    method TEXT NOT NULL DEFAULT 'UPI',
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Transactions & Ledger Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id TEXT NOT NULL,
    job_id UUID REFERENCES public.print_jobs(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL DEFAULT 'CREDIT',
    reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Merchant Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'BASIC',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Print Jobs RLS:
-- Customers can insert new jobs with initial UPLOADED & PENDING status
CREATE POLICY "Allow public customer job creation"
ON public.print_jobs FOR INSERT
TO anon, authenticated
WITH CHECK (
    status = 'UPLOADED' AND
    (payment_status = 'PENDING' OR payment_status = 'AWAITING_CASH_CONFIRMATION') AND
    copies >= 1
);

-- Customers can view their own job or kiosk lookup by verification_code
CREATE POLICY "Allow customer job lookup"
ON public.print_jobs FOR SELECT
TO anon, authenticated
USING (
    customer_id = 'walk-in-customer' OR
    verification_code IS NOT NULL
);

-- Merchants can view and update only their own jobs
CREATE POLICY "Allow merchant manage own jobs"
ON public.print_jobs FOR ALL
TO authenticated
USING (
    auth.jwt() ->> 'merchant_id' = merchant_id OR
    auth.uid()::text = merchant_id
);

-- ==============================================================================
-- Supabase Storage Configuration (Private Bucket: print-documents)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('print-documents', 'print-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow customers to upload into print-documents/{merchant_id}/{job_id}/*
CREATE POLICY "Allow customer upload print documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'print-documents' AND
    (storage.foldername(name))[1] IS NOT NULL
);

-- Storage Policy: Allow read access for merchants and document owners
CREATE POLICY "Allow merchant read print documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'print-documents'
);

-- Storage Policy: Allow merchant or admin delete
CREATE POLICY "Allow merchant delete print documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'print-documents'
);

-- ==============================================================================
-- Supabase Realtime Publication
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'print_jobs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
    END IF;
END $$;
