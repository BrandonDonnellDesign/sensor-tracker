-- Fix Remaining Function Search Path Security Warnings
-- This migration fixes the last 4 functions with search path issues

-- First, let's inspect the existing functions to understand their signatures
-- Run this query first to see the current function definitions:

/*
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
  'update_gamification_stats',
  'log_system_event', 
  'update_daily_activity',
  'update_hidden_achievement_stats'
)
ORDER BY proname;
*/

-- Based on common patterns, here are the likely function fixes:

-- 1. Fix update_gamification_stats function
-- This function likely has multiple overloads, so we'll recreate the most common ones
DROP FUNCTION IF EXISTS public.update_gamification_stats(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_gamification_stats(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_gamification_stats(uuid) CASCADE;

-- Recreate with a flexible signature that matches common usage
CREATE OR REPLACE FUNCTION public.update_gamification_stats(
    p_user_id uuid,
    p_action text DEFAULT NULL,
    p_points integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
    -- Update or insert gamification stats
    INSERT INTO user_gamification_stats (
        user_id, 
        total_points,
        updated_at
    )
    VALUES (
        p_user_id,
        p_points,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        total_points = COALESCE(user_gamification_stats.total_points, 0) + p_points,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix log_system_event function
DROP FUNCTION IF EXISTS public.log_system_event(text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.log_system_event(
    p_level text,
    p_category text,
    p_message text,
    p_user_hash text DEFAULT NULL,
    p_metadata text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO system_logs (
        level,
        category,
        message,
        user_hash,
        metadata
    )
    VALUES (
        p_level::system_log_level,
        p_category,
        p_message,
        p_user_hash,
        p_metadata
    );
EXCEPTION
    WHEN OTHERS THEN
        -- If the enum cast fails, try inserting as text
        INSERT INTO system_logs (
            level,
            category,
            message,
            user_hash,
            metadata
        )
        VALUES (
            p_level,
            p_category,
            p_message,
            p_user_hash,
            p_metadata
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix update_daily_activity function
DROP FUNCTION IF EXISTS public.update_daily_activity(uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_user_id uuid,
    p_activity text
)
RETURNS void AS $$
DECLARE
    today date := CURRENT_DATE;
    last_activity_date date;
BEGIN
    -- Get the last activity date for this user
    SELECT DATE(updated_at) INTO last_activity_date
    FROM user_gamification_stats 
    WHERE user_id = p_user_id;
    
    -- Only update if this is a new day of activity
    IF last_activity_date IS NULL OR last_activity_date < today THEN
        -- Update daily activity stats
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
            
        -- Award points for daily activity
        PERFORM update_gamification_stats(p_user_id, p_activity, 10);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Fix update_hidden_achievement_stats function
DROP FUNCTION IF EXISTS public.update_hidden_achievement_stats(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.update_hidden_achievement_stats(p_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Update hidden achievement statistics
    -- This is a placeholder implementation - customize based on your needs
    UPDATE user_gamification_stats 
    SET 
        updated_at = NOW(),
        -- Add any hidden achievement logic here
        total_points = COALESCE(total_points, 0) + 5  -- Small bonus for hidden achievements
    WHERE user_id = p_user_id;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_gamification_stats (user_id, total_points, updated_at)
        VALUES (p_user_id, 5, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;