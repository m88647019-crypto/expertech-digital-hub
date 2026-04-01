-- =============================================
-- Table: print_jobs
-- Core table for managing print job uploads
-- =============================================

-- Create enums first
DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'printing', 'completed', 'collected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'mpesa', 'card');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create the print_jobs table
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
  status job_status NOT NULL DEFAULT 'pending',
  price numeric DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  payment_method payment_method,
  branch text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at trigger
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

-- Enable RLS
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view print jobs"
  ON public.print_jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert print jobs"
  ON public.print_jobs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anon users can insert print jobs"
  ON public.print_jobs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated users can update print jobs"
  ON public.print_jobs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete print jobs"
  ON public.print_jobs FOR DELETE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
