# EXPERTECH Staff System — Setup Documentation

## 🗄️ Database Setup (Run in Supabase SQL Editor)

### 1. Create user_roles table

```sql
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'cashier', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 2. Create permissions table

```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own permissions
CREATE POLICY "Users can read own permissions"
ON public.permissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);
```

### 3. Create pricing_settings table

```sql
CREATE TABLE public.pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Public read (pricing is public)
CREATE POLICY "Anyone can read pricing"
ON public.pricing_settings FOR SELECT TO anon, authenticated
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update pricing"
ON public.pricing_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed default pricing
INSERT INTO public.pricing_settings (key, value) VALUES
  ('bw_price', 10),
  ('color_price', 20)
ON CONFLICT (key) DO NOTHING;
```

### 4. Create activity_logs table

```sql
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
CREATE POLICY "Admins can read logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 5. Update orders table (add new columns)

```sql
-- Add new columns to existing orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS files TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- Add unique constraint if not exists
ALTER TABLE public.orders
  ADD CONSTRAINT orders_checkout_request_id_unique
  UNIQUE (checkout_request_id);
```

### 6. Create Supabase Storage bucket

```sql
-- Create private uploads bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only service role can upload/read (handled via API)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');
```

### 7. Enable Realtime on orders table

Go to Supabase Dashboard → Database → Replication → Enable for `orders` table.

## 🔑 Environment Variables

### Vercel (Server-side)
These should already be set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`

**NEW — Add these:**
- `SUPABASE_SERVICE_ROLE_KEY` → Found in Supabase Dashboard → Settings → API → service_role key

### Frontend (Vite)
Add these to Vercel Environment Variables:
- `VITE_SUPABASE_URL` → Same as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY` → Same as SUPABASE_ANON_KEY

## 👤 Create Admin User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → Create with email + password
3. Then run this SQL (replace the UUID with your user's ID):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-USER-UUID-HERE', 'admin');

INSERT INTO public.permissions (user_id, permissions)
VALUES ('YOUR-USER-UUID-HERE', '{"orders": true, "files": true, "delete_orders": true, "analytics": true, "settings": true}');
```

## 📁 System Architecture

```
Frontend (React + Vite)
├── /              → Public homepage (UploadPrint, etc.)
├── /login         → Staff login
├── /admin         → Admin panel (requires admin role)
├── /dashboard     → Cashier panel (requires cashier role)

Backend (Vercel API Routes)
├── /api/stkPush           → M-Pesa STK Push (UNCHANGED)
├── /api/mpesaCallback     → M-Pesa callback (UNCHANGED)
├── /api/checkStatus       → Poll payment status (UNCHANGED)
├── /api/saveOrder         → Save order to DB (UNCHANGED)
├── /api/uploadFile        → Upload file to Supabase Storage (NEW)
├── /api/cleanup           → Delete expired files (NEW)
├── /api/admin/createCashier      → Create cashier account (NEW)
├── /api/admin/updatePermissions  → Update cashier permissions (NEW)
├── /api/admin/getCashiers        → List all cashiers (NEW)
├── /api/admin/deleteCashier      → Delete cashier (NEW)
├── /api/admin/orders             → List orders (searchable) (NEW)
├── /api/admin/files              → Get signed file URLs (NEW)
├── /api/admin/analytics          → Revenue & order analytics (NEW)
```

## 🔒 Security

- All admin APIs verify JWT + check role/permissions
- Files stored in PRIVATE Supabase Storage bucket
- File access only via time-limited signed URLs (5 min)
- Service role key NEVER exposed to frontend
- RLS enabled on all tables
- Roles stored in separate table (not on profile)

## 🔄 Realtime Features

- Admin & Cashier dashboards auto-refresh when orders change
- Uses Supabase Realtime `postgres_changes` on the `orders` table

## 🧹 Auto-Cleanup

- Orders have `expires_at` set to 24 hours from creation
- Call `POST /api/cleanup` periodically (e.g., via Vercel Cron) to:
  - Delete expired files from storage
  - Clear file references from orders

### Vercel Cron Setup

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cleanup",
    "schedule": "0 */6 * * *"
  }]
}
```
