-- ============================================
-- Migration: Terms of Service content
-- Run this in your Supabase SQL Editor
-- ============================================
-- Adds a "terms_of_service" key to business_settings holding the
-- markdown/plain-text content of the public Terms page. Admins edit
-- this from Admin → Terms of Service.
-- ============================================

INSERT INTO public.business_settings (key, value)
VALUES (
  'terms_of_service',
  E'# Terms of Service\n\nWelcome to Expertech Digital Hub. By using our services you agree to the following terms.\n\n## 1. Services\nWe provide printing, government e-services, and related digital assistance.\n\n## 2. Payments\nAll prices are in KES. Payments are processed securely via M-Pesa.\n\n## 3. File Handling\nUploaded files are automatically deleted 24 hours after processing for your privacy.\n\n## 4. Liability\nWe are not liable for delays caused by third-party government portals.\n\n## 5. Contact\nFor any questions, contact us using the details on our website footer.'
)
ON CONFLICT (key) DO NOTHING;
