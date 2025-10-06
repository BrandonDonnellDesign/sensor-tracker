-- Fix Security Issues Migration
-- Addresses Supabase linting errors by using application-level security instead of complex RLS

-- 1. Simplify profiles RLS - just basic user access, admin handled at app level
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select_policy" ON public.profiles;

-- Users can only see their own profile - clean and simple
CREATE POLICY "users_own_profile_only" ON public.profiles
    FOR SELECT USING (id = (SELECT auth.uid()));

-- Keep existing insert/update policies (they should be fine)
-- Admin access will be handled at the application level via middleware

-- 2. Revert sensor_models to simple working policies  
DROP POLICY IF EXISTS "sensor_models_admin_policy" ON public.sensor_models;
DROP POLICY IF EXISTS "sensor_models_select_policy" ON public.sensor_models;
DROP POLICY IF EXISTS "sensor_models_select_policy_users" ON public.sensor_models;
DROP POLICY IF EXISTS "sensor_models_read_policy" ON public.sensor_models;
DROP POLICY IF EXISTS "sensor_models_admin_write_policy" ON public.sensor_models;

-- Allow all authenticated users to read sensor models (this is safe and needed)
CREATE POLICY "sensor_models_read_policy" ON public.sensor_models
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

-- 3. Note: Admin functions should use service role client to bypass RLS
-- This is more secure than complex RLS policies that can cause circular references
-- The application middleware already protects admin routes properly

-- Grant access to admin views for service role operations
GRANT SELECT ON admin_active_users_30d TO service_role;
GRANT SELECT ON admin_sensor_stats TO service_role;
GRANT SELECT ON admin_user_engagement TO service_role;
GRANT SELECT ON admin_cleanup_stats TO service_role;
GRANT SELECT ON admin_system_health TO service_role;

-- Add comment explaining security model
COMMENT ON VIEW admin_active_users_30d IS 'Admin analytics view - access controlled by application-level role checks';
COMMENT ON VIEW admin_sensor_stats IS 'Admin analytics view - access controlled by application-level role checks';
COMMENT ON VIEW admin_user_engagement IS 'Admin analytics view - access controlled by application-level role checks';
COMMENT ON VIEW admin_cleanup_stats IS 'Admin analytics view - access controlled by application-level role checks';
COMMENT ON VIEW admin_system_health IS 'Admin analytics view - access controlled by application-level role checks';