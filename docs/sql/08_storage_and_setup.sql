-- ============================================================
-- 08_storage_and_setup.sql
-- Storage bucket for file uploads + RLS policies
-- Run this in your external Supabase SQL Editor
-- ============================================================

-- 1. Create the uploads storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone to upload files (customers upload before auth)
CREATE POLICY "Anyone can upload files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads');

-- 3. Allow authenticated users to read/download files
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

-- 4. Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');

-- 5. Enable realtime on print_jobs (for admin panel live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;

-- 6. Ensure business_settings has unique key constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_settings_key_key'
  ) THEN
    ALTER TABLE public.business_settings ADD CONSTRAINT business_settings_key_key UNIQUE (key);
  END IF;
END $$;

-- 7. Seed default business settings (won't overwrite existing)
INSERT INTO public.business_settings (key, value) VALUES
  ('business_name', 'Expertech Digital Hub'),
  ('contact_email', 'expertechcomputers1@gmail.com'),
  ('contact_phone', '+254 746 721989'),
  ('whatsapp_number', '254746721989'),
  ('bw_price', '10'),
  ('color_price', '20')
ON CONFLICT (key) DO NOTHING;
