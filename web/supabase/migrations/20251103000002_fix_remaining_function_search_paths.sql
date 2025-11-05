-- Fix remaining function search_path security warnings
-- This migration handles functions that weren't fixed in the previous migration

-- Functions that still need search_path fixes based on linter warnings
DO $$ 
BEGIN
  -- Functions with parameters that need specific signatures
  
  -- Rate limiting functions
  BEGIN
    -- Try different possible signatures for increment_rate_limit
    ALTER FUNCTION public.increment_rate_limit(TEXT, TEXT, INTEGER, INTERVAL) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION public.increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Function doesn't exist or has different signature
    END;
  END;
  
  -- Community functions with parameters
  BEGIN
    ALTER FUNCTION public.get_user_vote_for_tip(UUID, UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.toggle_tip_bookmark(UUID, UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.toggle_tip_vote(UUID, UUID, TEXT) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.toggle_comment_vote(UUID, UUID, TEXT) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_user_community_stats(UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Notification functions with parameters
  BEGIN
    ALTER FUNCTION public.get_notification_stats(UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
  
  BEGIN
    ALTER FUNCTION public.update_notification_preferences(UUID, JSONB) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Email functions with parameters
  BEGIN
    ALTER FUNCTION public.mark_email_sent(UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.queue_email(UUID, TEXT, TEXT, TEXT, JSONB) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION public.queue_email(UUID, TEXT, TEXT, TEXT) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
  
  -- Dexcom functions with parameters
  BEGIN
    ALTER FUNCTION public.user_token_needs_refresh(UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.trigger_dexcom_auto_refresh(UUID) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER FUNCTION public.log_dexcom_operation(UUID, TEXT, TEXT, JSONB) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION public.log_dexcom_operation(UUID, TEXT, TEXT) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
  
  -- Admin and utility functions with parameters
  BEGIN
    ALTER FUNCTION public.get_admin_audit_logs_with_user_info(INTEGER, INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION public.get_admin_audit_logs_with_user_info(INTEGER) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
  
  BEGIN
    ALTER FUNCTION public.log_bulk_sensor_operations(UUID, TEXT, INTEGER) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION public.log_bulk_sensor_operations(UUID, TEXT) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
  
  -- Security logging function with multiple possible signatures
  BEGIN
    ALTER FUNCTION public.log_security_event(TEXT, TEXT, TEXT, TEXT, JSONB) SET search_path = public;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION public.log_security_event(TEXT, TEXT, TEXT, JSONB) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        ALTER FUNCTION public.log_security_event(UUID, TEXT, TEXT, JSONB) SET search_path = public;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END;
  
END $$;

-- Alternative approach: Try to fix functions by name without specific signatures
-- This will apply to all overloads of functions with the same name
DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
BEGIN
  -- Get all functions that still need fixing
  FOR func_record IN 
    SELECT 
      p.proname,
      p.oid,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_notification_stats',
      'get_pending_emails', 
      'get_community_leaderboard',
      'get_user_vote_for_tip',
      'increment_rate_limit',
      'toggle_tip_bookmark',
      'get_admin_audit_logs_with_user_info',
      'mark_email_sent',
      'get_ai_moderation_stats',
      'update_notification_preferences',
      'get_active_users_leaderboard',
      'get_expiring_dexcom_tokens',
      'toggle_tip_vote',
      'check_rate_limit',
      'user_token_needs_refresh',
      'log_bulk_sensor_operations',
      'create_notification',
      'queue_email',
      'log_security_event',
      'trigger_dexcom_auto_refresh',
      'get_helpful_users_leaderboard',
      'get_user_community_stats',
      'toggle_comment_vote',
      'log_dexcom_operation'
    )
    AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig)))
  LOOP
    BEGIN
      -- Build the function signature
      func_signature := 'public.' || func_record.proname || '(' || func_record.args || ')';
      
      -- Try to alter the function
      EXECUTE 'ALTER FUNCTION ' || func_signature || ' SET search_path = public';
      
      RAISE NOTICE 'Successfully set search_path for function: %', func_signature;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to set search_path for function: % - Error: %', func_signature, SQLERRM;
    END;
  END LOOP;
END $$;

-- Log the completion of this additional migration
INSERT INTO system_logs (level, category, message, user_hash, metadata)
VALUES (
  'info',
  'security',
  'Additional function security migration completed',
  'system',
  jsonb_build_object(
    'migration', '20251103000002_fix_remaining_function_search_paths',
    'applied_at', NOW(),
    'security_improvement', 'remaining_search_path_restrictions_applied'
  )
) ON CONFLICT DO NOTHING;