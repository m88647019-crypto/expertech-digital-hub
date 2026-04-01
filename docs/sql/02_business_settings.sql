-- =============================================
-- Table: business_settings
-- Key-value store for admin configuration
-- =============================================

CREATE TABLE IF NOT EXISTS public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view settings"
  ON public.business_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon users can view settings"
  ON public.business_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated users can upsert settings"
  ON public.business_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
  ON public.business_settings FOR UPDATE TO authenticated USING (true);

-- Seed default settings
INSERT INTO public.business_settings (key, value) VALUES
  ('business_name', 'Expertech Digital Hub'),
  ('whatsapp_number', ''),
  ('contact_email', ''),
  ('contact_phone', ''),
  ('price_per_page_bw', '10'),
  ('price_per_page_color', '30')
ON CONFLICT (key) DO NOTHING;
