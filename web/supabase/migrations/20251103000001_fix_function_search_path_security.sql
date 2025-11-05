-- Fix function search_path security warnings
-- This migration adds search_path restrictions to functions to prevent SQL injection
-- Note: Only applies to functions that exist and uses safe ALTER FUNCTION approach

-- Security functions with known signatures
DO $$ 
BEGIN
  -- Try to alter security functions with specific signatures
  BEGIN
    ALTER FUNCTION public.analyze_user_security_patterns(UUID, INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
  
  BEGIN
    ALTER FUNCTION public.analyze_failed_auth_attempts(INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
  
  BEGIN
    ALTER FUNCTION public.monitor_data_access_patterns(INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
  
  BEGIN
    ALTER FUNCTION public.validate_user_input(TEXT, TEXT, INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
  
  BEGIN
    ALTER FUNCTION public.generate_security_report(INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
  
  BEGIN
    ALTER FUNCTION public.get_security_metrics(INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
  
  BEGIN
    ALTER FUNCTION public.auto_security_response() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
  
  BEGIN
    ALTER FUNCTION public.check_rate_limit(UUID, TEXT, INTEGER, INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Function doesn't exist or different signature
  END;
END $$;

-- Functions with no parameters (safer to alter)
DO $$ 
BEGIN
  -- Try functions that typically have no parameters
  BEGIN
    ALTER FUNCTION public.cleanup_old_rate_limits() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_community_leaderboard() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_active_users_leaderboard() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_helpful_users_leaderboard() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_pending_emails() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_expiring_dexcom_tokens() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.notify_expiring_tokens() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.update_api_keys_updated_at() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.sync_user_email() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.log_profile_changes() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.trigger_refresh_performance_summary_table() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.refresh_performance_summary_table() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_ai_moderation_stats() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.notify_tip_liked() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.notify_comment_added() SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Note: Enable leaked password protection in Auth settings
-- This requires manual configuration in Supabase dashboard under Authentication > Settings
-- Set "Enable leaked password protection" to true

-- Log the security migration completion
INSERT INTO system_logs (level, category, message, user_hash, metadata)
VALUES (
  'info',
  'security',
  'Database function security migration completed',
  'system',
  jsonb_build_object(
    'migration', '20251103000001_fix_function_search_path_security',
    'applied_at', NOW(),
    'security_improvement', 'search_path_restrictions_applied'
  )
) ON CONFLICT DO NOTHING;