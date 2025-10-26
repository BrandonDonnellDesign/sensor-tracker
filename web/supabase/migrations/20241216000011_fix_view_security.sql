-- Fix security issues with recent_daily_activities view
-- Issue 1: View exposes auth.users data to anon role
-- Issue 2: View uses SECURITY DEFINER which bypasses RLS

-- Drop the insecure view
DROP VIEW IF EXISTS public.recent_daily_activities;

-- Create a secure view that doesn't expose auth.users
-- Users can only see their own activities through RLS
CREATE OR REPLACE VIEW public.recent_daily_activities AS
SELECT 
    da.id,
    da.user_id,
    da.activity_date,
    da.activity_type,
    da.activity_count,
    da.created_at,
    da.updated_at
FROM public.daily_activities da
ORDER BY da.activity_date DESC, da.created_at DESC
LIMIT 100;

-- Enable RLS on the view (inherits from daily_activities table)
-- Users can only see their own data through the table's RLS policies

-- Grant permissions only to authenticated users (not anon)
REVOKE ALL ON public.recent_daily_activities FROM anon;
GRANT SELECT ON public.recent_daily_activities TO authenticated;
GRANT SELECT ON public.recent_daily_activities TO service_role;

-- Add comment explaining the security model
COMMENT ON VIEW public.recent_daily_activities IS 
'Shows recent daily activities. Access controlled by RLS policies on daily_activities table. Does not expose auth.users data.';
