-- ============================================
-- Services System Tables
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Service categories (managed by admin)
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT 'FileText',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active service categories"
  ON public.service_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage service categories"
  ON public.service_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Services (managed by admin, shown in public dropdown)
CREATE TYPE public.payment_timing AS ENUM ('pay_first', 'pay_after');

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0,
  payment_timing public.payment_timing DEFAULT 'pay_after',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active services"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Service requests (submitted by public users)
CREATE TYPE public.service_request_status AS ENUM (
  'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  branch text DEFAULT 'eldoret',
  details text,
  status public.service_request_status DEFAULT 'pending',
  price numeric(10,2) DEFAULT 0,
  paid boolean DEFAULT false,
  payment_method text,
  payment_reference text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can submit service requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (true);

-- Only authenticated staff can read
CREATE POLICY "Authenticated users can read service requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/cashiers can update
CREATE POLICY "Staff can update service requests"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete
CREATE POLICY "Admins can delete service requests"
  ON public.service_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some default categories and services
INSERT INTO public.service_categories (name, icon, sort_order) VALUES
  ('Government Portals', 'Landmark', 1),
  ('Document Services', 'FileText', 2),
  ('Tech & Design', 'Palette', 3),
  ('Career Services', 'Briefcase', 4)
ON CONFLICT DO NOTHING;

-- Seed services (using subqueries for category_id)
INSERT INTO public.services (category_id, name, price, payment_timing, sort_order) VALUES
  ((SELECT id FROM public.service_categories WHERE name = 'Government Portals' LIMIT 1), 'KRA (iTax) Services', 500, 'pay_first', 1),
  ((SELECT id FROM public.service_categories WHERE name = 'Government Portals' LIMIT 1), 'eCitizen Services', 300, 'pay_first', 2),
  ((SELECT id FROM public.service_categories WHERE name = 'Government Portals' LIMIT 1), 'NTSA / TIMS', 500, 'pay_first', 3),
  ((SELECT id FROM public.service_categories WHERE name = 'Government Portals' LIMIT 1), 'HELB Application', 300, 'pay_after', 4),
  ((SELECT id FROM public.service_categories WHERE name = 'Government Portals' LIMIT 1), 'SHA / NHIF Registration', 200, 'pay_after', 5),
  ((SELECT id FROM public.service_categories WHERE name = 'Document Services' LIMIT 1), 'Printing (B&W)', 10, 'pay_after', 1),
  ((SELECT id FROM public.service_categories WHERE name = 'Document Services' LIMIT 1), 'Printing (Color)', 20, 'pay_after', 2),
  ((SELECT id FROM public.service_categories WHERE name = 'Document Services' LIMIT 1), 'Scanning', 20, 'pay_after', 3),
  ((SELECT id FROM public.service_categories WHERE name = 'Document Services' LIMIT 1), 'Binding', 100, 'pay_after', 4),
  ((SELECT id FROM public.service_categories WHERE name = 'Document Services' LIMIT 1), 'Lamination', 50, 'pay_after', 5),
  ((SELECT id FROM public.service_categories WHERE name = 'Tech & Design' LIMIT 1), 'Graphic Design', 1000, 'pay_first', 1),
  ((SELECT id FROM public.service_categories WHERE name = 'Tech & Design' LIMIT 1), 'Software Installation', 500, 'pay_after', 2),
  ((SELECT id FROM public.service_categories WHERE name = 'Career Services' LIMIT 1), 'Professional CV Writing', 500, 'pay_first', 1),
  ((SELECT id FROM public.service_categories WHERE name = 'Career Services' LIMIT 1), 'Cover Letter Design', 300, 'pay_first', 2),
  ((SELECT id FROM public.service_categories WHERE name = 'Career Services' LIMIT 1), 'Online Job Applications', 200, 'pay_after', 3)
ON CONFLICT DO NOTHING;