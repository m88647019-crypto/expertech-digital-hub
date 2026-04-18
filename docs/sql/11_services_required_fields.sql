-- ============================================
-- Migration: Multiple required fields per service
-- Run this in your Supabase SQL Editor
-- ============================================
-- Adds a JSONB column on services to store an array of
-- required fields (label, hint, required) so admins can
-- ask customers for several pieces of info per service.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS required_fields jsonb DEFAULT '[]'::jsonb;

-- Optional: Backfill required_fields from legacy detail_hint when present
UPDATE public.services
SET required_fields = jsonb_build_array(
  jsonb_build_object('label', detail_hint, 'hint', '', 'required', true)
)
WHERE requires_details = true
  AND detail_hint IS NOT NULL
  AND (required_fields IS NULL OR required_fields = '[]'::jsonb);

-- Helpful index if you later filter on this
CREATE INDEX IF NOT EXISTS idx_services_required_fields
  ON public.services USING gin (required_fields);
