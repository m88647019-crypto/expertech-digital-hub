-- =============================================
-- EXTERNAL BACKEND: FIX ADMIN ROLE SETUP
-- =============================================
-- Why the previous SQL failed:
-- The UUID used in the old file did not exist in the user table referenced
-- by public.user_roles.user_id in your own backend.

-- =============================================
-- STEP 1: CHECK WHICH TABLE user_roles.user_id REFERENCES
-- =============================================
SELECT
  tc.constraint_name,
  ccu.table_schema AS referenced_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'user_roles'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id';

-- =============================================
-- STEP 2A: USE THIS IF THE RESULT POINTS TO auth.users
-- =============================================
-- Replace admin@example.com with the real admin email.

SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'admin@example.com';

WITH target_user AS (
  SELECT id
  FROM auth.users
  WHERE email = 'admin@example.com'
  LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM target_user
ON CONFLICT (user_id, role) DO NOTHING;

WITH target_user AS (
  SELECT id
  FROM auth.users
  WHERE email = 'admin@example.com'
  LIMIT 1
)
INSERT INTO public.permissions (user_id, permissions)
SELECT
  id,
  '{"orders": true, "files": true, "delete_orders": true, "analytics": true, "settings": true}'::jsonb
FROM target_user
ON CONFLICT (user_id) DO UPDATE
SET permissions = EXCLUDED.permissions,
    updated_at = now();

-- =============================================
-- STEP 2B: USE THIS INSTEAD IF THE RESULT POINTS TO public.users
-- =============================================
-- 1. First get the correct ID from your own public.users table.
-- 2. Replace the placeholder UUID below with the real row ID from public.users.
-- 3. Run this block instead of STEP 2A.

-- Example lookup (edit if your public.users table uses different columns):
-- SELECT id, email FROM public.users WHERE email = 'admin@example.com';

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('REPLACE-WITH-REAL-PUBLIC-USERS-ID', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- INSERT INTO public.permissions (user_id, permissions)
-- VALUES (
--   'REPLACE-WITH-REAL-PUBLIC-USERS-ID',
--   '{"orders": true, "files": true, "delete_orders": true, "analytics": true, "settings": true}'::jsonb
-- )
-- ON CONFLICT (user_id) DO UPDATE
-- SET permissions = EXCLUDED.permissions,
--     updated_at = now();

-- =============================================
-- STEP 3: VERIFY
-- =============================================
SELECT ur.user_id, ur.role
FROM public.user_roles ur
ORDER BY ur.role, ur.user_id;

SELECT p.user_id, p.permissions
FROM public.permissions p
ORDER BY p.user_id;