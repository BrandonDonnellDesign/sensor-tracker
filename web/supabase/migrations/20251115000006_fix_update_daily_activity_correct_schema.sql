-- Fix update_daily_activity to work with actual table structure
-- Table has unique constraint on (user_id, activity_date, activity_type)
-- This means one row per activity type per day

DROP FUNCTION IF EXISTS public.update_daily_activity(text, uuid);

CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_activity text,
    p_user_id uuid
)
RETURNS void AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_points integer := 0;
BEGIN
    -- Calculate points based on activity type
    CASE p_activity
        WHEN 'sensor_added' THEN v_points := 10;
        WHEN 'glucose_reading' THEN v_points := 1;
        WHEN 'food_log' THEN v_points := 5;
        WHEN 'login' THEN v_points := 5;
        ELSE v_points := 1;
    END CASE;
    
    -- Insert or update daily activity (one row per activity type per day)
    INSERT INTO public.daily_activities (
        user_id,
        activity_date,
        activity_type,
        activity_count,
        points_earned
    ) VALUES (
        p_user_id,
        v_today,
        p_activity,
        1,
        v_points
    )
    ON CONFLICT (user_id, activity_date, activity_type)
    DO UPDATE SET
        activity_count = daily_activities.activity_count + 1,
        points_earned = daily_activities.points_earned + v_points,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.update_daily_activity TO authenticated;

COMMENT ON FUNCTION public.update_daily_activity IS 'Updates daily activity metrics and points for a user';
