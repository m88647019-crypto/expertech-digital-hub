-- ============================================
-- Migration: Add requires_details columns to services
-- and add reports-related indexes
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add detail requirement fields to services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS requires_details boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS detail_hint text DEFAULT NULL;

-- Example: Update existing services that need details
-- UPDATE public.services SET requires_details = true, detail_hint = 'KRA PIN required' WHERE name ILIKE '%KRA%';
-- UPDATE public.services SET requires_details = true, detail_hint = 'Student details / HELB account' WHERE name ILIKE '%HELB%';

-- Index for faster report queries
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_paid ON public.service_requests(paid);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON public.print_jobs(created_at DESC);
