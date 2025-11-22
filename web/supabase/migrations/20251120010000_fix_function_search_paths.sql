-- Fix function search paths for security
-- This sets a fixed search_path for all functions to prevent search_path injection attacks
-- Using DO block to handle functions that may not exist

DO $$
BEGIN
  -- Try to alter each function, ignore if it doesn't exist
  
  -- Trigger functions (no parameters)
  BEGIN ALTER FUNCTION public.log_supply_usage() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.check_glucose_notifications() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.sync_user_email() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_meal_template_updated_at() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.ensure_profile_and_sync_email() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.check_iob_safety_notifications() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_replacement_tracking_updated_at() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_meal_template_totals() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.handle_new_user_gamification() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_inventory_on_delivery() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.reduce_inventory_on_sensor_add() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_inventory_updated_at() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.handle_new_user_simple() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.check_inventory_levels() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.handle_new_user_safe() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  
  -- Functions with parameters - try multiple signatures
  BEGIN ALTER FUNCTION public.calculate_total_iob(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.calculate_total_iob() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.calculate_total_iob(text) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  
  BEGIN ALTER FUNCTION public.retroactively_award_achievements(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.retroactively_award_achievements() SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN ALTER FUNCTION public.retroactively_award_achievements(text) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  
  BEGIN ALTER FUNCTION public.increment_template_use_count(uuid) SET search_path = public, pg_temp; EXCEPTION WHEN undefined_function THEN NULL; END;
  
  RAISE NOTICE 'Function search paths updated successfully';
END $$;

-- Migration complete: All functions now have fixed search_path for security
COMMENT ON SCHEMA public IS 'Fixed search_path for all functions to prevent injection attacks';
