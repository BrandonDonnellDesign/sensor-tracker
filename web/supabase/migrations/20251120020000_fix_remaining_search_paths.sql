-- Fix remaining function search paths
-- Query to find exact function signatures and fix them

DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
BEGIN
  -- Find and fix calculate_total_iob with any signature
  FOR func_record IN 
    SELECT 
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN ('calculate_total_iob', 'retroactively_award_achievements')
  LOOP
    func_signature := func_record.function_name || '(' || func_record.args || ')';
    
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I SET search_path = public, pg_temp', func_signature);
      RAISE NOTICE 'Fixed search_path for: %', func_signature;
    EXCEPTION WHEN OTHERS THEN
      -- Try alternative approach
      BEGIN
        EXECUTE format('ALTER FUNCTION public.%s SET search_path = public, pg_temp', func_signature);
        RAISE NOTICE 'Fixed search_path for: %', func_signature;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix: % - Error: %', func_signature, SQLERRM;
      END;
    END;
  END LOOP;
  
  RAISE NOTICE 'Remaining function search paths update complete';
END $$;
