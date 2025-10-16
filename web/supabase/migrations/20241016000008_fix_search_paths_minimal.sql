-- Minimal Fix for Function Search Path Security Warnings
-- This approach only fixes the most common functions and provides SQL for manual fixes

-- Fix the most common trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Alternative approach: Manual SQL commands to run in Supabase SQL Editor
-- Copy and paste these commands one by one, modifying them based on your actual function definitions

/*
-- To fix the remaining functions, you need to:
-- 1. Get the current function definition from your database
-- 2. Copy the function body
-- 3. Add "SET search_path = public" to the end
-- 4. Run CREATE OR REPLACE FUNCTION

-- Example template for each function:

-- For award_achievements_for_user:
-- First, check what parameters it currently has:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'award_achievements_for_user';

-- Then recreate with your existing logic + SET search_path = public

-- For update_gamification_stats:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'update_gamification_stats';

-- For check_and_award_achievements:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'check_and_award_achievements';

-- For is_current_user_admin:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'is_current_user_admin';

-- For retroactively_award_achievements:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'retroactively_award_achievements';

-- For log_system_event:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'log_system_event';

-- For update_daily_activity:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'update_daily_activity';

-- For update_updated_at_column:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'update_updated_at_column';

-- For update_hidden_achievement_stats:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'update_hidden_achievement_stats';

*/

-- Quick check to see what functions exist and their signatures:
-- Run this query to see all your functions:
-- SELECT 
--   proname as function_name,
--   pg_get_function_arguments(oid) as arguments,
--   pg_get_functiondef(oid) as definition
-- FROM pg_proc 
-- WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
-- AND proname IN (
--   'handle_updated_at',
--   'award_achievements_for_user', 
--   'check_and_award_achievements',
--   'is_current_user_admin',
--   'retroactively_award_achievements',
--   'update_gamification_stats',
--   'log_system_event',
--   'update_daily_activity',
--   'update_updated_at_column',
--   'update_hidden_achievement_stats'
-- );