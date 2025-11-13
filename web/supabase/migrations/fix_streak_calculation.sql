-- Fix streak calculation to include today's activity
CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_streak integer := 0;
    v_current_date date := CURRENT_DATE;
    v_check_date date;
    v_has_today boolean;
BEGIN
    -- Check if user has activity today
    SELECT EXISTS (
        SELECT 1 FROM public.daily_activities 
        WHERE user_id = p_user_id 
        AND activity_date = v_current_date 
        AND total_points > 0
    ) INTO v_has_today;
    
    -- If has activity today, start counting from today
    -- Otherwise start from yesterday
    IF v_has_today THEN
        v_check_date := v_current_date;
    ELSE
        v_check_date := v_current_date - 1;
    END IF;
    
    -- Count consecutive days with activity
    WHILE EXISTS (
        SELECT 1 FROM public.daily_activities 
        WHERE user_id = p_user_id 
        AND activity_date = v_check_date 
        AND total_points > 0
    ) LOOP
        v_streak := v_streak + 1;
        v_check_date := v_check_date - 1;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the update_daily_activity function to recalculate streak
CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_user_id uuid,
    p_activity_type text,
    p_increment integer DEFAULT 1
)
RETURNS void AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_points integer := 0;
    v_new_streak integer;
    v_current_longest integer;
BEGIN
    -- Calculate points based on activity type
    CASE p_activity_type
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
    
    -- Calculate new streak
    v_new_streak := calculate_user_streak(p_user_id);
    
    -- Get current longest streak
    SELECT longest_streak INTO v_current_longest
    FROM user_gamification_stats
    WHERE user_id = p_user_id;
    
    -- Update gamification stats with new streak
    UPDATE user_gamification_stats
    SET 
        current_streak = v_new_streak,
        longest_streak = GREATEST(COALESCE(v_current_longest, 0), v_new_streak),
        total_points = total_points + (v_points * p_increment),
        last_activity_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no stats exist, create them
    IF NOT FOUND THEN
        INSERT INTO user_gamification_stats (
            user_id,
            current_streak,
            longest_streak,
            total_points,
            last_activity_date
        ) VALUES (
            p_user_id,
            v_new_streak,
            v_new_streak,
            v_points * p_increment,
            v_today
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recalculate streak for all users
DO $$
DECLARE
    r RECORD;
    v_streak integer;
BEGIN
    FOR r IN SELECT DISTINCT user_id FROM user_gamification_stats LOOP
        v_streak := calculate_user_streak(r.user_id);
        
        UPDATE user_gamification_stats
        SET 
            current_streak = v_streak,
            longest_streak = GREATEST(longest_streak, v_streak)
        WHERE user_id = r.user_id;
    END LOOP;
END $$;
