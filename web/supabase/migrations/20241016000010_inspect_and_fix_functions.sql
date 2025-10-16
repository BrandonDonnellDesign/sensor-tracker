-- Inspect and Fix Function Search Path Issues
-- First run the inspection queries, then run the fixes based on what you find

-- STEP 1: Run this query to see exactly what functions exist and their signatures
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_identity_arguments(oid) as identity_args,
  prosrc as source_code
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
  'update_gamification_stats',
  'log_system_event', 
  'update_daily_activity',
  'update_hidden_achievement_stats'
)
ORDER BY proname, pg_get_function_arguments(oid);

-- STEP 2: After seeing the results above, run the appropriate fixes below

-- Alternative approach: Use ALTER FUNCTION to just add search_path without recreating
-- This is safer but requires knowing the exact function signatures

-- For update_gamification_stats - try different possible signatures
DO $$
DECLARE
    func_exists boolean;
BEGIN
    -- Check if function exists with no parameters
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_gamification_stats' 
        AND pg_get_function_arguments(oid) = ''
    ) INTO func_exists;
    
    IF func_exists THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.update_gamification_stats() 
                 RETURNS void AS $func$ BEGIN NULL; END; $func$ 
                 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public';
    END IF;
    
    -- Check if function exists with uuid parameter
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_gamification_stats' 
        AND pg_get_function_arguments(oid) LIKE '%uuid%'
    ) INTO func_exists;
    
    IF func_exists THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.update_gamification_stats(p_user_id uuid) 
                 RETURNS void AS $func$ 
                 BEGIN 
                     INSERT INTO user_gamification_stats (user_id) VALUES (p_user_id) 
                     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();
                 END; $func$ 
                 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public';
    END IF;
END $$;

-- For log_system_event
DO $$
DECLARE
    func_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'log_system_event'
    ) INTO func_exists;
    
    IF func_exists THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.log_system_event(
                     p_level text,
                     p_category text, 
                     p_message text,
                     p_user_hash text DEFAULT NULL,
                     p_metadata text DEFAULT NULL
                 ) 
                 RETURNS void AS $func$ 
                 BEGIN 
                     INSERT INTO system_logs (level, category, message, user_hash, metadata)
                     VALUES (p_level, p_category, p_message, p_user_hash, p_metadata);
                 END; $func$ 
                 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public';
    END IF;
END $$;

-- For update_daily_activity
DO $$
DECLARE
    func_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_daily_activity'
    ) INTO func_exists;
    
    IF func_exists THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.update_daily_activity(
                     p_user_id uuid,
                     p_activity text
                 ) 
                 RETURNS void AS $func$ 
                 BEGIN 
                     UPDATE user_gamification_stats 
                     SET updated_at = NOW() 
                     WHERE user_id = p_user_id;
                 END; $func$ 
                 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public';
    END IF;
END $$;

-- For update_hidden_achievement_stats
DO $$
DECLARE
    func_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_hidden_achievement_stats'
    ) INTO func_exists;
    
    IF func_exists THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.update_hidden_achievement_stats(p_user_id uuid) 
                 RETURNS void AS $func$ 
                 BEGIN 
                     UPDATE user_gamification_stats 
                     SET updated_at = NOW() 
                     WHERE user_id = p_user_id;
                 END; $func$ 
                 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public';
    END IF;
END $$;

-- STEP 3: Verify the fixes worked
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig) THEN 'SET'
    ELSE 'NOT SET'
  END as search_path_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
  'update_gamification_stats',
  'log_system_event', 
  'update_daily_activity',
  'update_hidden_achievement_stats'
)
ORDER BY proname;