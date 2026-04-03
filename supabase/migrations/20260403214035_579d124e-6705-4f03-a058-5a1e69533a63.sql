-- Add expertech.vercel.app as allowed redirect URL
-- This is handled via Supabase auth config, not SQL
-- But we ensure the functions have correct grants for anon access

-- Re-grant execute permissions (idempotent, safe to re-run)
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_assign_first_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.auto_assign_first_admin(UUID) TO authenticated;