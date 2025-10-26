-- Fix search_path security issues for functions
-- This prevents SQL injection attacks by setting an immutable search_path

-- Fix calculate_quarter_from_date function
DROP FUNCTION IF EXISTS public.calculate_quarter_from_date(date) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_quarter_from_date(input_date date)
RETURNS text AS $$
DECLARE
    quarter_num int;
    year_num int;
BEGIN
    quarter_num := EXTRACT(QUARTER FROM input_date);
    year_num := EXTRACT(YEAR FROM input_date);
    
    RETURN 'Q' || quarter_num || ' ' || year_num;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Fix update_estimated_quarter function
DROP FUNCTION IF EXISTS public.update_estimated_quarter() CASCADE;

CREATE OR REPLACE FUNCTION public.update_estimated_quarter()
RETURNS trigger AS $$
BEGIN
    -- Calculate the estimated quarter based on the estimated_date
    IF NEW.estimated_date IS NOT NULL THEN
        NEW.estimated_quarter := public.calculate_quarter_from_date(NEW.estimated_date);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.calculate_quarter_from_date(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_quarter_from_date(date) TO service_role;

-- Add comments
COMMENT ON FUNCTION public.calculate_quarter_from_date(date) IS 'Calculates quarter string (e.g., Q1 2024) from a date - IMMUTABLE with fixed search_path';
COMMENT ON FUNCTION public.update_estimated_quarter() IS 'Trigger function to update estimated_quarter field - SECURITY DEFINER with fixed search_path';
