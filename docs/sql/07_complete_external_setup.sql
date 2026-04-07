-- =============================================
-- COMPLETE EXTERNAL SUPABASE SETUP
-- Run this ONCE on your external Supabase project
-- (Supabase Dashboard → SQL Editor → New Query)
-- =============================================

-- =============================================
-- 1. ENUMS
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'cashier', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'printing', 'completed', 'collected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'mpesa', 'card');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 2. TABLES
-- =============================================

-- 2a. print_jobs
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  file_url text DEFAULT '',
  instructions text DEFAULT '',
  copies integer NOT NULL DEFAULT 1,
  color_option text NOT NULL DEFAULT 'bw',
  paper_size text NOT NULL DEFAULT 'A4',
  status public.job_status NOT NULL DEFAULT 'pending',
  price numeric DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  payment_method public.payment_method,
  branch text DEFAULT '',
  notes text DEFAULT '',
  checkout_request_id text DEFAULT '',
  receipt text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add new columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='print_jobs' AND column_name='checkout_request_id') THEN
    ALTER TABLE public.print_jobs ADD COLUMN checkout_request_id text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='print_jobs' AND column_name='receipt') THEN
    ALTER TABLE public.print_jobs ADD COLUMN receipt text DEFAULT '';
  END IF;
END $$;

-- 2b. payments (M-Pesa STK Push tracking)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  phone text,
  amount numeric,
  receipt text,
  result_desc text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2c. user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- 2d. permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2e. activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid,
  user_email text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2f. business_settings
CREATE TABLE IF NOT EXISTS public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 3. TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_print_jobs_updated_at ON public.print_jobs;
CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. SECURITY FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_first_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_assign_first_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- =============================================
-- 5. ROW LEVEL SECURITY
-- =============================================

-- print_jobs
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon users can insert print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Authenticated users can view print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Authenticated users can insert print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Authenticated users can update print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Authenticated users can delete print jobs" ON public.print_jobs;

CREATE POLICY "Anon users can insert print jobs" ON public.print_jobs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated users can view print jobs" ON public.print_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert print jobs" ON public.print_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update print jobs" ON public.print_jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete print jobs" ON public.print_jobs FOR DELETE TO authenticated USING (true);

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Anon can read payments" ON public.payments;
DROP POLICY IF EXISTS "Anon can update payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated can manage payments" ON public.payments;

CREATE POLICY "Anon can insert payments" ON public.payments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read payments" ON public.payments FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update payments" ON public.payments FOR UPDATE TO anon USING (true);
CREATE POLICY "Authenticated can manage payments" ON public.payments FOR ALL TO authenticated USING (true);

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.permissions;

CREATE POLICY "Users can view their own permissions" ON public.permissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all permissions" ON public.permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.activity_logs;

CREATE POLICY "Admins can view activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- business_settings
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon users can view settings" ON public.business_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.business_settings;
DROP POLICY IF EXISTS "Authenticated users can upsert settings" ON public.business_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.business_settings;

CREATE POLICY "Anon users can view settings" ON public.business_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view settings" ON public.business_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can upsert settings" ON public.business_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON public.business_settings FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 6. REALTIME (FIXED)
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'print_jobs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
    END IF;
END $$;

-- =============================================
-- 7. STORAGE BUCKET (FIXED)
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can upload (anon customers)
DROP POLICY IF EXISTS "Anyone can upload files" ON storage.objects;
CREATE POLICY "Anyone can upload files"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'uploads');

-- Storage RLS: authenticated (admin/cashier) can view/download
DROP POLICY IF EXISTS "Authenticated can view uploads" ON storage.objects;
CREATE POLICY "Authenticated can view uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'uploads');

-- Storage RLS: authenticated can delete
DROP POLICY IF EXISTS "Authenticated can delete uploads" ON storage.objects;
CREATE POLICY "Authenticated can delete uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'uploads');

-- =============================================
-- 8. DEFAULT BUSINESS SETTINGS
-- =============================================
INSERT INTO public.business_settings (key, value) VALUES
  ('business_name', 'Expertech Digital Hub'),
  ('price_per_page_bw', '10'),
  ('price_per_page_color', '20'),
  ('whatsapp_number', '254746721989'),
  ('branches', 'Main Branch')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 9. ASSIGN ADMIN ROLE
-- =============================================
-- (Keep commented as per original template)
/*
WITH target AS (
  SELECT id FROM auth.users WHERE email = 'your-admin@email.com' LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM target
ON CONFLICT (user_id, role) DO NOTHING;

WITH target AS (
  SELECT id FROM auth.users WHERE email = 'your-admin@email.com' LIMIT 1
)
INSERT INTO public.permissions (user_id, permissions)
SELECT id, '{"orders": true, "files": true, "delete_orders": true, "analytics": true, "settings": true}'::jsonb
FROM target
ON CONFLICT (user_id) DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = now();
*/
