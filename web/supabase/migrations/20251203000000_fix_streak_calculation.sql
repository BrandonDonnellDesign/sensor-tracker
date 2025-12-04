-- Fix streak calculation to prevent infinite loops and support longer streaks
-- The original function had no limit, which could cause performance issues

CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_streak integer := 0;
    v_current_date date := CURRENT_DATE;
    v_check_date date;
    v_max_days integer := 365; -- Safety limit: check up to 1 year back
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

COMMENT ON FUNCTION public.calculate_user_streak IS 'Calculates the current streak for a user based on daily activities (max 365 days)';

-- Drop all versions of the function (there may be multiple overloads)
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP FUNCTION IF EXISTS ' || oid::regprocedure || ';', ' ')
        FROM pg_proc
        WHERE proname = 'update_daily_activity'
        AND pronamespace = 'public'::regnamespace
    );
END $$;

-- Update the update_daily_activity function to also update streak in user_gamification_stats
CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_user_id uuid,
    p_activity_type text,
    p_increment integer DEFAULT 1
)
RETURNS void AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_points integer := 0;
    v_current_streak integer := 0;
BEGIN
    -- Calculate points based on activity type
    CASE p_activity_type
        WHEN 'sensor_added' THEN v_points := 10;
        WHEN 'glucose_reading' THEN v_points := 1;
        WHEN 'food_log' THEN v_points := 5;
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
        CASE WHEN p_activity_type = 'sensor_added' THEN p_increment ELSE 0 END,
        CASE WHEN p_activity_type = 'glucose_reading' THEN p_increment ELSE 0 END,
        CASE WHEN p_activity_type = 'food_log' THEN p_increment ELSE 0 END,
        v_points * p_increment
    )
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET
        sensors_added = daily_activities.sensors_added + 
            CASE WHEN p_activity_type = 'sensor_added' THEN p_increment ELSE 0 END,
        glucose_readings = daily_activities.glucose_readings + 
            CASE WHEN p_activity_type = 'glucose_reading' THEN p_increment ELSE 0 END,
        food_logs = daily_activities.food_logs + 
            CASE WHEN p_activity_type = 'food_log' THEN p_increment ELSE 0 END,
        total_points = daily_activities.total_points + (v_points * p_increment),
        updated_at = NOW();
    
    -- Calculate current streak
    v_current_streak := public.calculate_user_streak(p_user_id);
    
    -- Update user_gamification_stats with new streak
    UPDATE public.user_gamification_stats
    SET 
        current_streak = v_current_streak,
        longest_streak = GREATEST(longest_streak, v_current_streak),
        last_activity_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no stats record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.user_gamification_stats (
            user_id,
            current_streak,
            longest_streak,
            last_activity_date
        ) VALUES (
            p_user_id,
            v_current_streak,
            v_current_streak,
            v_today
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.update_daily_activity IS 'Updates daily activity metrics, points, and streak for a user';

-- Recalculate streaks for all existing users
DO $$
DECLARE
    user_record RECORD;
    calculated_streak integer;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT user_id FROM public.user_gamification_stats
    LOOP
        -- Calculate the streak for this user
        calculated_streak := public.calculate_user_streak(user_record.user_id);
        
        -- Update their stats
        UPDATE public.user_gamification_stats
        SET 
            current_streak = calculated_streak,
            longest_streak = GREATEST(longest_streak, calculated_streak),
            updated_at = NOW()
        WHERE user_id = user_record.user_id;
        
        RAISE NOTICE 'Updated streak for user %: % days', user_record.user_id, calculated_streak;
    END LOOP;
END $$;
