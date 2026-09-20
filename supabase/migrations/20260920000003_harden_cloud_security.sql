-- AutoPrint V2 hardening
-- The local SQLite queue remains the V1 source of truth. This migration makes
-- the optional cloud surface merchant-scoped and keeps print documents private.

ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS downloading_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_print_jobs_merchant_device_status
  ON public.print_jobs (merchant_id, device_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.merchant_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL REFERENCES public.merchants(merchant_id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  installation_id TEXT NOT NULL UNIQUE,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  device_name TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_devices_merchant
  ON public.merchant_devices (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_merchant_devices_auth_user
  ON public.merchant_devices (auth_user_id);

ALTER TABLE public.merchant_devices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.merchant_devices FROM anon, authenticated;
GRANT SELECT, INSERT ON public.merchant_devices TO authenticated;

DROP POLICY IF EXISTS "Device can read its own registration" ON public.merchant_devices;
CREATE POLICY "Device can read its own registration"
  ON public.merchant_devices FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = auth_user_id AND status = 'ACTIVE');

DROP POLICY IF EXISTS "Trusted merchant identity can register its device" ON public.merchant_devices;
CREATE POLICY "Trusted merchant identity can register its device"
  ON public.merchant_devices FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = auth_user_id
    AND status = 'ACTIVE'
    AND merchant_id = ((select auth.jwt()) -> 'app_metadata' ->> 'merchant_id')
  );

-- Replace the initial permissive policies. Browser clients may create only the
-- initial unpaid metadata row; all reads and protected state changes are
-- merchant-device authenticated operations.
DROP POLICY IF EXISTS "Allow public customer job creation" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow customer job lookup" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow merchant manage own jobs" ON public.print_jobs;

REVOKE ALL ON public.print_jobs FROM anon, authenticated;
GRANT INSERT ON public.print_jobs TO anon, authenticated;
GRANT SELECT ON public.print_jobs TO authenticated;
GRANT UPDATE (
  status, device_id, attempt_count, error_code, error_message,
  received_at, downloading_at, file_ready_at, queued_at,
  printing_at, printed_at, ready_for_collection_at, collected_at
) ON public.print_jobs TO authenticated;

CREATE POLICY "Customers can create unpaid jobs"
  ON public.print_jobs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'UPLOADED'
    AND payment_status IN ('PENDING', 'AWAITING_CASH_CONFIRMATION')
    AND copies BETWEEN 1 AND 500
    AND file_size > 0
    AND file_hash IS NOT NULL
    AND storage_path LIKE 'print-documents/%'
  );

CREATE POLICY "Devices can read own merchant jobs"
  ON public.print_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.merchant_devices d
      WHERE d.auth_user_id = (select auth.uid())
        AND d.merchant_id = print_jobs.merchant_id
        AND d.status = 'ACTIVE'
        AND (print_jobs.device_id IS NULL OR print_jobs.device_id = d.device_id)
    )
  );

CREATE POLICY "Devices can update own merchant operational state"
  ON public.print_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.merchant_devices d
      WHERE d.auth_user_id = (select auth.uid())
        AND d.merchant_id = print_jobs.merchant_id
        AND d.status = 'ACTIVE'
        AND (print_jobs.device_id IS NULL OR print_jobs.device_id = d.device_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.merchant_devices d
      WHERE d.auth_user_id = (select auth.uid())
        AND d.merchant_id = print_jobs.merchant_id
        AND d.status = 'ACTIVE'
        AND (print_jobs.device_id IS NULL OR print_jobs.device_id = d.device_id)
    )
  );

CREATE OR REPLACE FUNCTION public.validate_print_job_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'PAID' AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'payment state can only be set by trusted payment processing';
  END IF;

  IF NOT (
    (OLD.status = 'UPLOADED' AND NEW.status = 'PAYMENT_PENDING') OR
    (OLD.status = 'PAYMENT_PENDING' AND NEW.status IN ('PAID', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED')) OR
    (OLD.status = 'PAID' AND NEW.status IN ('READY_TO_PRINT', 'CANCELLED')) OR
    (OLD.status = 'READY_TO_PRINT' AND NEW.status IN ('DOWNLOADING', 'QUEUED', 'CANCELLED', 'EXPIRED')) OR
    (OLD.status = 'DOWNLOADING' AND NEW.status IN ('FILE_READY', 'DOWNLOAD_FAILED', 'FILE_VERIFICATION_FAILED', 'CANCELLED')) OR
    (OLD.status = 'DOWNLOAD_FAILED' AND NEW.status IN ('DOWNLOADING', 'CANCELLED')) OR
    (OLD.status = 'FILE_VERIFICATION_FAILED' AND NEW.status IN ('DOWNLOADING', 'CANCELLED')) OR
    (OLD.status = 'FILE_READY' AND NEW.status IN ('QUEUED', 'CANCELLED')) OR
    (OLD.status = 'QUEUED' AND NEW.status IN ('PRINTING', 'CANCELLED', 'EXPIRED')) OR
    (OLD.status = 'PRINTING' AND NEW.status IN ('PRINTED', 'PRINT_FAILED', 'CANCELLED')) OR
    (OLD.status = 'PRINTED' AND NEW.status IN ('READY_FOR_COLLECTION', 'COLLECTED')) OR
    (OLD.status = 'READY_FOR_COLLECTION' AND NEW.status = 'COLLECTED') OR
    (OLD.status = 'PAYMENT_FAILED' AND NEW.status IN ('PAYMENT_PENDING', 'CANCELLED', 'EXPIRED')) OR
    (OLD.status = 'PRINT_FAILED' AND NEW.status IN ('QUEUED', 'READY_TO_PRINT', 'CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'invalid print job transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS print_job_transition_guard ON public.print_jobs;
CREATE TRIGGER print_job_transition_guard
  BEFORE UPDATE OF status ON public.print_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_print_job_transition();

-- A private bucket must not expose object reads to anonymous customers. Uploads
-- are one-way and are intentionally non-upsert so they do not need SELECT or
-- UPDATE access. Merchant devices can read only their first path segment.
DROP POLICY IF EXISTS "Allow customer upload print documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow merchant read print documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow merchant delete print documents" ON storage.objects;

REVOKE ALL ON storage.objects FROM anon, authenticated;
GRANT INSERT ON storage.objects TO anon, authenticated;
GRANT SELECT ON storage.objects TO authenticated;

CREATE POLICY "Customers can upload print documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'print-documents'
    AND array_length(storage.foldername(name), 1) >= 3
  );

CREATE POLICY "Devices can download own merchant documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'print-documents'
    AND EXISTS (
      SELECT 1
      FROM public.merchant_devices d
      WHERE d.auth_user_id = (select auth.uid())
        AND d.merchant_id = (storage.foldername(name))[1]
        AND d.status = 'ACTIVE'
    )
  );

-- Keep the Realtime publication metadata-only: the document itself never
-- travels through Realtime, and RLS filters rows per authenticated device.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'merchant_devices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_devices;
  END IF;
END $$;
