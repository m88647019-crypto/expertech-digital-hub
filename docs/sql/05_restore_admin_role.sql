-- =============================================
-- RESTORE ADMIN ROLE AFTER DATABASE WIPE
-- Run this if you wiped user_roles but still have auth accounts
-- =============================================

-- Assign admin role to the first registered user
-- Replace the UUID with your actual user ID from auth.users
INSERT INTO public.user_roles (user_id, role)
VALUES ('44492dea-64f6-4c41-991f-375270ae9dfc', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- To find your user ID, run:
-- SELECT id, email, email_confirmed_at FROM auth.users ORDER BY created_at;

-- To check current roles:
-- SELECT ur.user_id, ur.role, u.email
-- FROM public.user_roles ur
-- JOIN auth.users u ON u.id = ur.user_id;

-- =============================================
-- IMPORTANT NOTES:
-- 1. After wiping user_roles, existing auth accounts lose their roles
-- 2. The login page checks admin_exists() - if false, it shows
--    the "Set up admin account" link
-- 3. Users must have a confirmed email to log in
-- 4. elvisambulo11@gmail.com has NOT confirmed their email yet
-- =============================================
