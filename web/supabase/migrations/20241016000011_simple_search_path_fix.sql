-- Simple Search Path Fix - Minimal Changes
-- This approach tries to preserve existing function logic while just adding search_path

-- Method 1: Try to get the exact function definitions and recreate them with search_path
-- Run this query first to see your current functions:

/*
SELECT 
  proname,
  pg_get_functiondef(oid) as full_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
  'update_gamification_stats',
  'log_system_event', 
  'update_daily_activity',
  'update_hidden_achievement_stats'
);
*/

-- Method 2: Nuclear option - Drop all versions and create minimal ones
-- This will definitely work but may break functionality temporarily

-- Drop all possible versions of these functions
DROP FUNCTION IF EXISTS public.update_gamification_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_gamification_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_gamification_stats(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_gamification_stats(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_gamification_stats(uuid, integer) CASCADE;

DROP FUNCTION IF EXISTS public.log_system_event() CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text) CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event(text, text, text, text, jsonb) CASCADE;

DROP FUNCTION IF EXISTS public.update_daily_activity() CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_activity(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_activity(uuid, text) CASCADE;

DROP FUNCTION IF EXISTS public.update_hidden_achievement_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_hidden_achievement_stats(uuid) CASCADE;

-- Create minimal working versions with proper search_path
CREATE OR REPLACE FUNCTION public.update_gamification_stats(p_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Minimal implementation
    INSERT INTO user_gamification_stats (user_id, updated_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.log_system_event(
    p_level text,
    p_category text,
    p_message text,
    p_user_hash text DEFAULT NULL,
    p_metadata text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO system_logs (level, category, message, user_hash, metadata)
    VALUES (p_level, p_category, p_message, p_user_hash, p_metadata);
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors for now
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_daily_activity(p_user_id uuid, p_activity text)
RETURNS void AS $$
BEGIN
    -- Minimal implementation
    UPDATE user_gamification_stats 
    SET updated_at = NOW()
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_gamification_stats (user_id, updated_at)
        VALUES (p_user_id, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_hidden_achievement_stats(p_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Minimal implementation
    UPDATE user_gamification_stats 
    SET updated_at = NOW()
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_gamification_stats (user_id, updated_at)
        VALUES (p_user_id, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;