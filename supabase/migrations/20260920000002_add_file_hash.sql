-- Migration: 20260920000002_add_file_hash
-- Purpose: Add file_hash (SHA-256) column to print_jobs table for end-to-end file integrity verification

ALTER TABLE public.print_jobs 
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Index for file hash lookups and deduplication audits
CREATE INDEX IF NOT EXISTS idx_print_jobs_file_hash ON public.print_jobs (file_hash);
