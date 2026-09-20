-- Migration: 20260920000001_transmission_sync
-- Purpose: Add transmission timestamps for device/cloud reconciliation.

ALTER TABLE public.print_jobs
ADD COLUMN IF NOT EXISTS transmitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_print_jobs_transmitted_at ON public.print_jobs (transmitted_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_received_at ON public.print_jobs (received_at);
