-- Fix streak calculation to properly handle activity tracking
-- The issue is that streaks are resetting because the function is checking for the wrong field

-- First, let's ensure the daily_activities table has the correct structure
ALTER TABLE IF EXISTS public.daily_activities 
ADD COLUMN IF NOT EXISTS total_points integer DEFAULT 0;

-- Update existing rows to have total_points if they don't
UPDATE public.daily_activities
SET total_points = COALESCE(
    (sensors_added * 10) + 
    (glucose_readings * 1) + 
    (food_logs * 5),
    0
)
WHERE total_points = 0 OR total_points IS NULL;

-- Fix the streak calculation function to be more lenient
-- A user maintains their streak if they had ANY activity in the last 24-48 hours
CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_streak integer := 0;
    v_current_date date := CURRENT_DATE;
    v_check_date date;
    v_has_recent_activity boolean;
    v_yesterday date := CURRENT_DATE - 1;
BEGIN
    -- Check if user has activity today OR yesterday (grace period)
    SELECT EXISTS (
        SELECT 1 FROM public.daily_activities 
        WHERE user_id = p_user_id 
        AND activity_date >= v_yesterday
        AND (
            total_points > 0 OR 
            sensors_added > 0 OR 
            glucose_readings > 0 OR 
            food_logs > 0
        )
    ) INTO v_has_recent_activity;
    
    -- If no recent activity, streak is 0
    IF NOT v_has_recent_activity THEN
        RETURN 0;
    END IF;
    
    -- Start counting from today
    v_check_date := v_current_date;
    
    -- Count consecutive days with activity
    -- Allow 1-day gaps (so if you miss a day, you don't lose your streak immediately)
    WHILE v_check_date >= v_current_date - 365 LOOP  -- Max 1 year lookback
        -- Check if this date has activity
        IF EXISTS (
            SELECT 1 FROM public.daily_activities 
            WHERE user_id = p_user_id 
            AND activity_date = v_check_date 
            AND (
                total_points > 0 OR 
                sensors_added > 0 OR 
                glucose_readings > 0 OR 
                food_logs > 0
            )
        ) THEN
            v_streak := v_streak + 1;
            v_check_date := v_check_date - 1;
        ELSE
            -- Check if previous day had activity (allow 1-day gap)
            IF EXISTS (
                SELECT 1 FROM public.daily_activities 
                WHERE user_id = p_user_id 
                AND activity_date = v_check_date - 1
                AND (
                    total_points > 0 OR 
                    sensors_added > 0 OR 
                    glucose_readings > 0 OR 
                    food_logs > 0
                )
            ) THEN
                -- Skip this day but continue counting
                v_check_date := v_check_date - 1;
            ELSE
                -- Two consecutive days with no activity, break streak
                EXIT;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update the last_activity_date whenever ANY activity is recorded
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
        WHEN 'insulin_log' THEN v_points := 3;
        WHEN 'supply_added' THEN v_points := 2;
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

-- Recalculate streaks for all users to fix any that were incorrectly reset
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
            longest_streak = GREATEST(COALESCE(longest_streak, 0), v_streak),
            updated_at = NOW()
        WHERE user_id = r.user_id;
    END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.calculate_user_streak TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_activity TO authenticated;

COMMENT ON FUNCTION public.calculate_user_streak IS 'Calculates current streak with 1-day grace period. Checks multiple activity fields to ensure streak is maintained.';
COMMENT ON FUNCTION public.update_daily_activity IS 'Updates daily activity metrics, points, and recalculates streak. Updates last_activity_date to maintain streak.';
