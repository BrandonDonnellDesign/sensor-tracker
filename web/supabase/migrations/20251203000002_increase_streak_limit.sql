-- Increase streak calculation limit to support multi-year streaks
-- Change from 365 days to 3650 days (10 years)

CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_streak integer := 0;
    v_current_date date := CURRENT_DATE;
    v_check_date date;
    v_max_days integer := 3650; -- Safety limit: check up to 10 years back
    v_days_checked integer := 0;
BEGIN
    -- Start from today and count backwards
    v_check_date := v_current_date;
    
    -- Loop with safety limit
    WHILE v_days_checked < v_max_days LOOP
        -- Check if there's activity on this date
        IF EXISTS (
            SELECT 1 FROM public.daily_activities 
            WHERE user_id = p_user_id 
            AND activity_date = v_check_date
        ) THEN
            v_streak := v_streak + 1;
            v_check_date := v_check_date - 1;
            v_days_checked := v_days_checked + 1;
        ELSE
            -- No activity found, streak is broken
            EXIT;
        END IF;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.calculate_user_streak IS 'Calculates the current streak for a user based on daily activities (max 3650 days / 10 years)';
