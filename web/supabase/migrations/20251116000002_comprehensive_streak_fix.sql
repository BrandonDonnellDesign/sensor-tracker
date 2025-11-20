-- Comprehensive streak fix that looks at actual user activity across all tables
-- This will properly calculate streaks based on real usage, not just daily_activities table

-- First, fix the daily_activities table constraint
-- Drop the old constraint that doesn't include activity_type
ALTER TABLE daily_activities 
DROP CONSTRAINT IF EXISTS daily_activities_user_id_activity_date_key;

-- Add the correct unique constraint that includes activity_type
ALTER TABLE daily_activities 
ADD CONSTRAINT daily_activities_user_id_activity_date_activity_type_key 
UNIQUE (user_id, activity_date, activity_type);

-- Add activity_type and activity_count columns if they don't exist
ALTER TABLE daily_activities 
ADD COLUMN IF NOT EXISTS activity_type text;

ALTER TABLE daily_activities 
ADD COLUMN IF NOT EXISTS activity_count integer DEFAULT 0;

ALTER TABLE daily_activities 
ADD COLUMN IF NOT EXISTS points_earned integer DEFAULT 0;

-- Create a function that checks for ANY user activity on a given date
CREATE OR REPLACE FUNCTION public.has_activity_on_date(p_user_id uuid, p_date date)
RETURNS boolean AS $$
BEGIN
    -- Check sensors added
    IF EXISTS (
        SELECT 1 FROM sensors 
        WHERE user_id = p_user_id 
        AND DATE(created_at) = p_date
    ) THEN
        RETURN true;
    END IF;
    
    -- Check food logs
    IF EXISTS (
        SELECT 1 FROM food_logs 
        WHERE user_id = p_user_id 
        AND DATE(logged_at) = p_date
    ) THEN
        RETURN true;
    END IF;
    
    -- Check glucose readings
    IF EXISTS (
        SELECT 1 FROM glucose_readings 
        WHERE user_id = p_user_id 
        AND DATE(created_at) = p_date
    ) THEN
        RETURN true;
    END IF;
    
    -- Check insulin logs (not doses)
    BEGIN
        IF EXISTS (
            SELECT 1 FROM insulin_logs 
            WHERE user_id = p_user_id 
            AND DATE(created_at) = p_date
        ) THEN
            RETURN true;
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            NULL; -- Table doesn't exist, skip
    END;
    
    -- Check supplies inventory
    BEGIN
        IF EXISTS (
            SELECT 1 FROM diabetes_supplies_inventory 
            WHERE user_id = p_user_id 
            AND DATE(created_at) = p_date
        ) THEN
            RETURN true;
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            NULL; -- Table doesn't exist, skip
    END;
    
    -- Check daily activities table
    IF EXISTS (
        SELECT 1 FROM daily_activities 
        WHERE user_id = p_user_id 
        AND activity_date = p_date
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the streak calculation to use actual activity
CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_streak integer := 0;
    v_check_date date := CURRENT_DATE;
    v_max_lookback integer := 365; -- Look back up to 1 year
    v_days_checked integer := 0;
    v_consecutive_inactive_days integer := 0;
BEGIN
    -- Count consecutive days with activity, allowing 1-day gaps
    WHILE v_days_checked < v_max_lookback LOOP
        IF has_activity_on_date(p_user_id, v_check_date) THEN
            -- Found activity, add to streak and reset inactive counter
            v_streak := v_streak + 1;
            v_consecutive_inactive_days := 0;
        ELSE
            -- No activity on this day
            v_consecutive_inactive_days := v_consecutive_inactive_days + 1;
            
            -- If 2 consecutive days with no activity, break the streak
            -- But allow grace period if we're at the beginning (today or yesterday)
            IF v_consecutive_inactive_days >= 2 AND v_days_checked > 1 THEN
                EXIT;
            END IF;
        END IF;
        
        v_check_date := v_check_date - 1;
        v_days_checked := v_days_checked + 1;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill daily_activities from actual user activity
CREATE OR REPLACE FUNCTION public.backfill_daily_activities(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_date date;
    v_sensors integer;
    v_food_logs integer;
    v_glucose integer;
    v_insulin integer;
    v_supplies integer;
    v_points integer;
BEGIN
    -- Get the earliest activity date for this user
    SELECT MIN(earliest_date) INTO v_date
    FROM (
        SELECT MIN(DATE(created_at)) as earliest_date FROM sensors WHERE user_id = p_user_id
        UNION ALL
        SELECT MIN(DATE(logged_at)) FROM food_logs WHERE user_id = p_user_id
        UNION ALL
        SELECT MIN(DATE(created_at)) FROM glucose_readings WHERE user_id = p_user_id
    ) dates;
    
    -- If no activity found, exit
    IF v_date IS NULL THEN
        RETURN;
    END IF;
    
    -- Loop through each day from earliest activity to today
    WHILE v_date <= CURRENT_DATE LOOP
        -- Count activities for this date
        SELECT COUNT(*) INTO v_sensors FROM sensors 
        WHERE user_id = p_user_id AND DATE(created_at) = v_date;
        
        SELECT COUNT(*) INTO v_food_logs FROM food_logs 
        WHERE user_id = p_user_id AND DATE(logged_at) = v_date;
        
        SELECT COUNT(*) INTO v_glucose FROM glucose_readings 
        WHERE user_id = p_user_id AND DATE(created_at) = v_date;
        
        -- Try to count insulin logs if table exists
        v_insulin := 0;
        BEGIN
            SELECT COUNT(*) INTO v_insulin FROM insulin_logs 
            WHERE user_id = p_user_id AND DATE(created_at) = v_date;
        EXCEPTION
            WHEN undefined_table THEN
                v_insulin := 0;
        END;
        
        -- Try to count supplies if table exists
        v_supplies := 0;
        BEGIN
            SELECT COUNT(*) INTO v_supplies FROM diabetes_supplies_inventory 
            WHERE user_id = p_user_id AND DATE(created_at) = v_date;
        EXCEPTION
            WHEN undefined_table THEN
                v_supplies := 0;
        END;
        
        -- Calculate points
        v_points := (v_sensors * 10) + (v_food_logs * 5) + (v_glucose * 1) + (v_insulin * 3) + (v_supplies * 2);
        
        -- Insert daily activities for each activity type if there was any activity
        IF v_sensors > 0 THEN
            INSERT INTO daily_activities (
                user_id,
                activity_date,
                activity_type,
                activity_count,
                points_earned
            ) VALUES (
                p_user_id,
                v_date,
                'sensor_added',
                v_sensors,
                v_sensors * 10
            )
            ON CONFLICT (user_id, activity_date, activity_type)
            DO UPDATE SET
                activity_count = EXCLUDED.activity_count,
                points_earned = EXCLUDED.points_earned,
                updated_at = NOW();
        END IF;
        
        IF v_food_logs > 0 THEN
            INSERT INTO daily_activities (
                user_id,
                activity_date,
                activity_type,
                activity_count,
                points_earned
            ) VALUES (
                p_user_id,
                v_date,
                'food_log',
                v_food_logs,
                v_food_logs * 5
            )
            ON CONFLICT (user_id, activity_date, activity_type)
            DO UPDATE SET
                activity_count = EXCLUDED.activity_count,
                points_earned = EXCLUDED.points_earned,
                updated_at = NOW();
        END IF;
        
        IF v_glucose > 0 THEN
            INSERT INTO daily_activities (
                user_id,
                activity_date,
                activity_type,
                activity_count,
                points_earned
            ) VALUES (
                p_user_id,
                v_date,
                'glucose_reading',
                v_glucose,
                v_glucose * 1
            )
            ON CONFLICT (user_id, activity_date, activity_type)
            DO UPDATE SET
                activity_count = EXCLUDED.activity_count,
                points_earned = EXCLUDED.points_earned,
                updated_at = NOW();
        END IF;
        
        v_date := v_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill daily activities for all users and recalculate streaks
DO $$
DECLARE
    r RECORD;
    v_streak integer;
    v_total_points integer;
BEGIN
    -- Get all users who have any activity
    FOR r IN 
        SELECT DISTINCT user_id 
        FROM (
            SELECT user_id FROM sensors
            UNION
            SELECT user_id FROM food_logs
            UNION
            SELECT user_id FROM glucose_readings
        ) all_users
    LOOP
        -- Backfill their daily activities
        PERFORM backfill_daily_activities(r.user_id);
        
        -- Calculate their streak
        v_streak := calculate_user_streak(r.user_id);
        
        -- Calculate total points from daily activities
        SELECT COALESCE(SUM(points_earned), 0) INTO v_total_points
        FROM daily_activities
        WHERE user_id = r.user_id;
        
        -- Update or create gamification stats
        INSERT INTO user_gamification_stats (
            user_id,
            current_streak,
            longest_streak,
            total_points,
            last_activity_date
        ) VALUES (
            r.user_id,
            v_streak,
            v_streak,
            v_total_points,
            CURRENT_DATE
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            current_streak = v_streak,
            longest_streak = GREATEST(user_gamification_stats.longest_streak, v_streak),
            total_points = v_total_points,
            last_activity_date = CURRENT_DATE,
            updated_at = NOW();
            
        RAISE NOTICE 'Updated user % - Streak: %, Points: %', r.user_id, v_streak, v_total_points;
    END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_activity_on_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_streak TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_daily_activities TO authenticated;

COMMENT ON FUNCTION public.has_activity_on_date IS 'Checks if user had ANY activity (sensors, food, glucose, insulin, supplies) on a specific date';
COMMENT ON FUNCTION public.calculate_user_streak IS 'Calculates streak based on actual user activity across all tables, allows 1-day gaps';
COMMENT ON FUNCTION public.backfill_daily_activities IS 'Backfills daily_activities table from actual user activity in all tables';
