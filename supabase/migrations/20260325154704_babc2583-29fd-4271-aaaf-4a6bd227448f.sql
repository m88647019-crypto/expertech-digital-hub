
-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'printing', 'completed', 'collected', 'cancelled');

-- Create enum for payment method
CREATE TYPE public.payment_method AS ENUM ('cash', 'mpesa', 'card');

-- Create print_jobs table
CREATE TABLE public.print_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  instructions TEXT DEFAULT '',
  copies INTEGER NOT NULL DEFAULT 1,
  color_option TEXT NOT NULL DEFAULT 'bw',
  paper_size TEXT NOT NULL DEFAULT 'A4',
  status job_status NOT NULL DEFAULT 'pending',
  price NUMERIC(10,2) DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  payment_method payment_method,
  branch TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all print jobs
CREATE POLICY "Authenticated users can view print jobs"
  ON public.print_jobs FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert print jobs
CREATE POLICY "Authenticated users can insert print jobs"
  ON public.print_jobs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Anon users can also insert (public upload form)
CREATE POLICY "Anon users can insert print jobs"
  ON public.print_jobs FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated users can update print jobs
CREATE POLICY "Authenticated users can update print jobs"
  ON public.print_jobs FOR UPDATE TO authenticated
  USING (true);

-- Authenticated users can delete print jobs
CREATE POLICY "Authenticated users can delete print jobs"
  ON public.print_jobs FOR DELETE TO authenticated
  USING (true);

-- Create business_settings table
CREATE TABLE public.business_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
  ON public.business_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon users can view settings"
  ON public.business_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated users can upsert settings"
  ON public.business_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
  ON public.business_settings FOR UPDATE TO authenticated USING (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business settings
INSERT INTO public.business_settings (key, value) VALUES
  ('business_name', 'Expertech Digital Hub'),
  ('whatsapp_number', '254746721989'),
  ('contact_email', 'info@expertech.co.ke'),
  ('contact_phone', '+254 746 721 989'),
  ('bw_price', '10'),
  ('color_price', '20');
