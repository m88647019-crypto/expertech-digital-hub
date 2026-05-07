
-- ============================================
-- Services system
-- ============================================
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

DROP POLICY IF EXISTS "Anyone can read active service categories" ON public.service_categories;
CREATE POLICY "Anyone can read active service categories"
  ON public.service_categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage service categories" ON public.service_categories;
CREATE POLICY "Admins can manage service categories"
  ON public.service_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TYPE public.payment_timing AS ENUM ('pay_first', 'pay_after');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0,
  payment_timing public.payment_timing DEFAULT 'pay_after',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  requires_details boolean DEFAULT false,
  detail_hint text,
  required_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
CREATE POLICY "Anyone can read active services"
  ON public.services FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  CREATE TYPE public.service_request_status AS ENUM
    ('pending','confirmed','in_progress','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_reason text,
  discount_approved boolean NOT NULL DEFAULT false,
  discount_approved_by uuid,
  discount_approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit service requests" ON public.service_requests;
CREATE POLICY "Anyone can submit service requests"
  ON public.service_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can read service requests" ON public.service_requests;
CREATE POLICY "Authenticated users can read service requests"
  ON public.service_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff can update service requests" ON public.service_requests;
CREATE POLICY "Staff can update service requests"
  ON public.service_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can delete service requests" ON public.service_requests;
CREATE POLICY "Admins can delete service requests"
  ON public.service_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
DROP TRIGGER IF EXISTS update_service_categories_updated_at ON public.service_categories;
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_paid ON public.service_requests(paid);

-- Seed categories
INSERT INTO public.service_categories (name, icon, sort_order) VALUES
  ('Government Portals', 'Landmark', 1),
  ('Document Services', 'FileText', 2),
  ('Tech & Design', 'Palette', 3),
  ('Career Services', 'Briefcase', 4)
ON CONFLICT DO NOTHING;

-- Seed services
INSERT INTO public.services (category_id, name, price, payment_timing, sort_order)
SELECT c.id, v.name, v.price, v.timing::public.payment_timing, v.sort_order
FROM (VALUES
  ('Government Portals','KRA (iTax) Services',500,'pay_first',1),
  ('Government Portals','eCitizen Services',300,'pay_first',2),
  ('Government Portals','NTSA / TIMS',500,'pay_first',3),
  ('Government Portals','HELB Application',300,'pay_after',4),
  ('Government Portals','SHA / NHIF Registration',200,'pay_after',5),
  ('Document Services','Printing (B&W)',10,'pay_after',1),
  ('Document Services','Printing (Color)',20,'pay_after',2),
  ('Document Services','Scanning',20,'pay_after',3),
  ('Document Services','Binding',100,'pay_after',4),
  ('Document Services','Lamination',50,'pay_after',5),
  ('Tech & Design','Graphic Design',1000,'pay_first',1),
  ('Tech & Design','Software Installation',500,'pay_after',2),
  ('Career Services','Professional CV Writing',500,'pay_first',1),
  ('Career Services','Cover Letter Design',300,'pay_first',2),
  ('Career Services','Online Job Applications',200,'pay_after',3)
) AS v(cat_name, name, price, timing, sort_order)
JOIN public.service_categories c ON c.name = v.cat_name
WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.name = v.name);

-- ============================================
-- Business settings: align keys with UI + add new ones
-- ============================================
INSERT INTO public.business_settings (key, value) VALUES
  ('contact_email', 'expertechcomputers1@gmail.com'),
  ('contact_phone', '+254 746 721989'),
  ('whatsapp_number', '254746721989'),
  ('bw_price', '10'),
  ('color_price', '20'),
  ('show_prices_on_cards', 'true'),
  ('terms_of_service', E'# Terms of Service\n\nWelcome to Expertech Digital Hub. By using our services you agree to the following terms.\n\n## 1. Services\nWe provide printing, government e-services, and related digital assistance.\n\n## 2. Payments\nAll prices are in KES. Payments are processed securely via M-Pesa.\n\n## 3. File Handling\nUploaded files are automatically deleted 24 hours after processing for your privacy.\n\n## 4. Liability\nWe are not liable for delays caused by third-party government portals.\n\n## 5. Contact\nFor any questions, contact us using the details on our website footer.')
ON CONFLICT (key) DO NOTHING;

-- Mirror legacy keys to new keys if new is empty
UPDATE public.business_settings SET value = (SELECT value FROM public.business_settings WHERE key = 'phone_number')
  WHERE key = 'contact_phone' AND (value IS NULL OR value = '+254 746 721989')
    AND EXISTS (SELECT 1 FROM public.business_settings WHERE key='phone_number' AND value <> '');
UPDATE public.business_settings SET value = (SELECT value FROM public.business_settings WHERE key = 'email')
  WHERE key = 'contact_email' AND (value IS NULL OR value = 'expertechcomputers1@gmail.com')
    AND EXISTS (SELECT 1 FROM public.business_settings WHERE key='email' AND value <> '');
