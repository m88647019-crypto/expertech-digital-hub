-- ============================================
-- Migration: Admin pricing visibility + discounts
-- Run this in your Supabase SQL Editor
-- ============================================
-- 1. Adds a global "show_prices_on_cards" setting (in business_settings)
-- 2. Adds discount_amount, discount_reason, discount_approved on service_requests
--    so admins can record and approve a discount per request.
-- ============================================

-- 1. Default the global toggle to "true" if not present
INSERT INTO public.business_settings (key, value)
VALUES ('show_prices_on_cards', 'true')
ON CONFLICT (key) DO NOTHING;

-- 2. Discount columns on service_requests
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS discount_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS discount_approved_at timestamptz;

-- Convenience index for filtering pending discount approvals
CREATE INDEX IF NOT EXISTS idx_service_requests_discount_pending
  ON public.service_requests (discount_approved)
  WHERE discount_amount > 0 AND discount_approved = false;
