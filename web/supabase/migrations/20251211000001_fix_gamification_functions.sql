-- Fix missing gamification functions
-- This migration ensures the RPC functions exist for activity logging

-- Create or replace function to update daily activity and calculate points
CREATE OR REPLACE FUNCTION update_daily_activity(
    p_activity TEXT,
    p_user_id UUID
) RETURNS VOID AS $$
DECLARE
    v_points INTEGER := 0;
    v_current_date DATE := CURRENT_DATE;
    v_last_activity_date DATE;
    v_current_streak INTEGER := 0;
    v_longest_streak INTEGER := 0;
BEGIN
    -- Determine points based on activity type
    CASE p_activity
        WHEN 'login' THEN v_points := 5;
        WHEN 'sensor_added' THEN v_points := 20;
        WHEN 'glucose_sync' THEN v_points := 10;
        WHEN 'inventory_updated' THEN v_points := 5;
        WHEN 'profile_updated' THEN v_points := 10;
        ELSE v_points := 1;
    END CASE;

    -- Insert or update daily activity (ignore if already exists for today)
    INSERT INTO daily_activities (user_id, activity_type, activity_date, points_earned)
    VALUES (p_user_id, p_activity, v_current_date, v_points)
    ON CONFLICT (user_id, activity_type, activity_date) DO NOTHING;

    -- Get or create user gamification stats
    INSERT INTO user_gamification_stats (user_id, total_points, current_streak, longest_streak, level, last_activity_date)
    VALUES (p_user_id, 0, 0, 0, 1, NULL)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get current stats
    SELECT last_activity_date, current_streak, longest_streak
    INTO v_last_activity_date, v_current_streak, v_longest_streak
    FROM user_gamification_stats
    WHERE user_id = p_user_id;

    -- Calculate streak
    IF v_last_activity_date IS NULL THEN
        -- First activity
        v_current_streak := 1;
    ELSIF v_last_activity_date = v_current_date THEN
        -- Already active today, don't change streak
        v_current_streak := v_current_streak;
    ELSIF v_last_activity_date = v_current_date - INTERVAL '1 day' THEN
        -- Consecutive day
        v_current_streak := v_current_streak + 1;
    ELSE
        -- Streak broken
        v_current_streak := 1;
    END IF;

    -- Update longest streak if current is longer
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Update user stats
    UPDATE user_gamification_stats
    SET 
        total_points = total_points + v_points,
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        level = GREATEST(1, (total_points + v_points) / 100 + 1),
        last_activity_date = v_current_date,
        updated_at = NOW(),
        -- Update activity counters
        sensors_added = CASE WHEN p_activity = 'sensor_added' THEN sensors_added + 1 ELSE sensors_added END,
        glucose_readings_synced = CASE WHEN p_activity = 'glucose_sync' THEN glucose_readings_synced + 1 ELSE glucose_readings_synced END
    WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user gamification stats
CREATE OR REPLACE FUNCTION get_user_gamification_stats(p_user_id UUID)
RETURNS TABLE (
    total_points INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    level INTEGER,
    sensors_added INTEGER,
    glucose_readings_synced INTEGER,
    achievements_unlocked INTEGER,
    last_activity_date DATE
) AS $$
BEGIN
    -- Ensure user has stats record
    INSERT INTO user_gamification_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Return stats
    RETURN QUERY
    SELECT 
        ugs.total_points,
        ugs.current_streak,
        ugs.longest_streak,
        ugs.level,
        ugs.sensors_added,
        ugs.glucose_readings_synced,
        ugs.achievements_unlocked,
        ugs.last_activity_date
    FROM user_gamification_stats ugs
    WHERE ugs.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to backfill missing activities for users
CREATE OR REPLACE FUNCTION backfill_user_activities(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sensor_count INTEGER;
    v_glucose_count INTEGER;
    v_login_days INTEGER;
BEGIN
    -- Count existing sensors for this user
    SELECT COUNT(*) INTO v_sensor_count
    FROM sensors
    WHERE user_id = p_user_id AND NOT is_deleted;

    -- Count glucose readings for this user (limit to recent ones to avoid huge numbers)
    SELECT COUNT(*) INTO v_glucose_count
    FROM glucose_readings
    WHERE user_id = p_user_id 
    AND created_at >= NOW() - INTERVAL '30 days';

    -- Estimate login days (rough estimate based on account age, max 30 days)
    SELECT LEAST(30, GREATEST(1, EXTRACT(days FROM NOW() - created_at)::INTEGER / 2)) INTO v_login_days
    FROM auth.users
    WHERE id = p_user_id;

    -- Update gamification stats with backfilled data
    INSERT INTO user_gamification_stats (
        user_id, 
        total_points, 
        sensors_added, 
        glucose_readings_synced,
        current_streak,
        longest_streak,
        level,
        last_activity_date
    )
    VALUES (
        p_user_id,
        (v_sensor_count * 20) + (LEAST(1000, v_glucose_count) * 1) + (v_login_days * 5), -- Cap glucose points
        v_sensor_count,
        LEAST(1000, v_glucose_count), -- Cap glucose count display
        LEAST(7, v_login_days), -- Assume current streak up to 7 days
        LEAST(14, v_login_days), -- Assume longest streak up to 14 days
        GREATEST(1, ((v_sensor_count * 20) + (LEAST(1000, v_glucose_count) * 1) + (v_login_days * 5)) / 100 + 1),
        CURRENT_DATE
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        sensors_added = EXCLUDED.sensors_added,
        glucose_readings_synced = EXCLUDED.glucose_readings_synced,
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        level = EXCLUDED.level,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = NOW();

    -- Add some recent daily activities to show activity
    INSERT INTO daily_activities (user_id, activity_type, activity_date, points_earned)
    VALUES 
        (p_user_id, 'login', CURRENT_DATE, 5),
        (p_user_id, 'login', CURRENT_DATE - 1, 5),
        (p_user_id, 'login', CURRENT_DATE - 2, 5)
    ON CONFLICT (user_id, activity_type, activity_date) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_daily_activity(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_gamification_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_user_activities(UUID) TO authenticated;