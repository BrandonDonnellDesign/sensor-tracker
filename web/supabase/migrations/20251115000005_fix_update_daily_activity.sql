-- Fix update_daily_activity function to match TypeScript types
-- Parameters must be: p_activity (text), p_user_id (uuid)

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.update_daily_activity(uuid, text, integer);
DROP FUNCTION IF EXISTS public.update_daily_activity(uuid, text);
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
    
    -- Insert or update daily activity
    INSERT INTO public.daily_activities (
        user_id,
        activity_date,
        sensors_added,
        glucose_readings,
        food_logs,
        total_points
    ) VALUES (
        p_user_id,
        v_today,
        CASE WHEN p_activity = 'sensor_added' THEN 1 ELSE 0 END,
        CASE WHEN p_activity = 'glucose_reading' THEN 1 ELSE 0 END,
        CASE WHEN p_activity = 'food_log' THEN 1 ELSE 0 END,
        v_points
    )
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET
        sensors_added = daily_activities.sensors_added + 
            CASE WHEN p_activity = 'sensor_added' THEN 1 ELSE 0 END,
        glucose_readings = daily_activities.glucose_readings + 
            CASE WHEN p_activity = 'glucose_reading' THEN 1 ELSE 0 END,
        food_logs = daily_activities.food_logs + 
            CASE WHEN p_activity = 'food_log' THEN 1 ELSE 0 END,
        total_points = daily_activities.total_points + v_points,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.update_daily_activity TO authenticated;

COMMENT ON FUNCTION public.update_daily_activity IS 'Updates daily activity metrics and points for a user';
