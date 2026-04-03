
-- Allow anon to call auto_assign_first_admin (safe: only works when no admin exists)
GRANT EXECUTE ON FUNCTION public.auto_assign_first_admin(uuid) TO anon;
