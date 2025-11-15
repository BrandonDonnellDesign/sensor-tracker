-- Drop existing function first
DROP FUNCTION IF EXISTS public.calculate_user_streak(uuid);

-- Create function to calculate user streak that resets on gaps
CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_streak integer := 0;
    v_check_date date := CURRENT_DATE;
BEGIN
    -- Count consecutive days backwards from today
    -- Stop when we find a day with no activity
    WHILE EXISTS (
        SELECT 1 
        FROM public.daily_activities 
        WHERE user_id = p_user_id 
        AND activity_date = v_check_date
        AND points_earned > 0
    ) LOOP
        v_streak := v_streak + 1;
        v_check_date := v_check_date - 1;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the update_daily_activity function to also update streak
CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_activity text,
    p_user_id uuid
)
RETURNS void AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_points integer := 0;
    v_new_streak integer;
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
    
    -- Calculate new streak
    v_new_streak := calculate_user_streak(p_user_id);
    
    -- Update user_gamification_stats if table exists
    BEGIN
        UPDATE user_gamification_stats
        SET 
            current_streak = v_new_streak,
            longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
            total_points = COALESCE(total_points, 0) + v_points,
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
                v_points,
                v_today
            );
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            -- Table doesn't exist, skip gamification stats update
            NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.calculate_user_streak TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_activity TO authenticated;

COMMENT ON FUNCTION public.calculate_user_streak IS 'Calculates current streak by counting consecutive days with activity (points > 0). Resets on gaps.';
COMMENT ON FUNCTION public.update_daily_activity IS 'Updates daily activity metrics, points, and recalculates streak';
