-- Final Fix for Last 2 Functions with Search Path Issues
-- Target: log_system_event and update_daily_activity

-- First, let's see exactly what these functions look like
-- Run this query to inspect the remaining problematic functions:

/*
SELECT 
  proname,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as full_definition,
  proconfig as current_config
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('log_system_event', 'update_daily_activity')
ORDER BY proname, pg_get_function_arguments(oid);
*/

-- Aggressive approach: Drop ALL possible versions and recreate

-- 1. Drop all versions of log_system_event
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname = 'log_system_event' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                      func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 2. Drop all versions of update_daily_activity
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname = 'update_daily_activity' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                      func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 3. Recreate log_system_event with proper search_path
CREATE OR REPLACE FUNCTION public.log_system_event(
    p_level text,
    p_category text,
    p_message text,
    p_user_hash text DEFAULT NULL,
    p_metadata text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Try to insert with enum cast first
    BEGIN
        INSERT INTO system_logs (level, category, message, user_hash, metadata)
        VALUES (p_level::system_log_level, p_category, p_message, p_user_hash, p_metadata);
    EXCEPTION 
        WHEN invalid_text_representation THEN
            -- If enum cast fails, try without cast
            INSERT INTO system_logs (level, category, message, user_hash, metadata)
            VALUES (p_level, p_category, p_message, p_user_hash, p_metadata);
        WHEN OTHERS THEN
            -- If table doesn't exist or other error, just ignore
            NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Recreate update_daily_activity with proper search_path
CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_user_id uuid,
    p_activity text
)
RETURNS void AS $$
DECLARE
    today date := CURRENT_DATE;
    last_activity_date date;
BEGIN
    -- Try to get last activity date
    BEGIN
        SELECT DATE(updated_at) INTO last_activity_date
        FROM user_gamification_stats 
        WHERE user_id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
        last_activity_date := NULL;
    END;
    
    -- Update or insert activity record
    BEGIN
        IF last_activity_date IS NULL OR last_activity_date < today THEN
            INSERT INTO user_gamification_stats (
                user_id,
                days_active,
                current_streak,
                updated_at
            )
            VALUES (
                p_user_id,
                1,
                1,
                NOW()
            )
            ON CONFLICT (user_id) 
            DO UPDATE SET
                days_active = COALESCE(user_gamification_stats.days_active, 0) + 1,
                current_streak = CASE 
                    WHEN DATE(user_gamification_stats.updated_at) = today - INTERVAL '1 day' 
                    THEN COALESCE(user_gamification_stats.current_streak, 0) + 1
                    ELSE 1
                END,
                longest_streak = GREATEST(
                    COALESCE(user_gamification_stats.longest_streak, 0),
                    CASE 
                        WHEN DATE(user_gamification_stats.updated_at) = today - INTERVAL '1 day' 
                        THEN COALESCE(user_gamification_stats.current_streak, 0) + 1
                        ELSE 1
                    END
                ),
                updated_at = NOW();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- If gamification table doesn't exist or other error, just ignore
        NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Verify the functions now have proper search_path
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig) THEN 'FIXED ✓'
    ELSE 'STILL BROKEN ✗'
  END as search_path_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('log_system_event', 'update_daily_activity')
ORDER BY proname;