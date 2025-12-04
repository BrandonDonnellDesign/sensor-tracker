-- Activate achievement system with automatic checking and awarding
-- This creates achievements and the logic to award them based on user stats

-- Add missing columns to achievements table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'achievements' AND column_name = 'requirement_type'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN requirement_type text;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'achievements' AND column_name = 'requirement_value'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN requirement_value integer;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'achievements' AND column_name = 'badge_color'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN badge_color text DEFAULT 'bronze';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'achievements' AND column_name = 'is_repeatable'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN is_repeatable boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'achievements' AND column_name = 'requirement_data'
    ) THEN
        ALTER TABLE public.achievements ADD COLUMN requirement_data jsonb;
    END IF;
END $$;

-- Add unique constraint on achievement name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'achievements_name_key'
    ) THEN
        ALTER TABLE public.achievements ADD CONSTRAINT achievements_name_key UNIQUE (name);
    END IF;
END $$;

-- First, ensure we have the necessary achievement types
INSERT INTO public.achievements (name, description, icon, points, category, requirement_type, requirement_value, is_active) VALUES
  -- Sensor achievements
  ('First Sensor', 'Added your first sensor', '🎯', 10, 'sensors', 'sensor_count', 1, true),
  ('Sensor Novice', 'Added 5 sensors', '📍', 25, 'sensors', 'sensor_count', 5, true),
  ('Sensor Veteran', 'Added 10 sensors', '🏆', 50, 'sensors', 'sensor_count', 10, true),
  ('Sensor Expert', 'Added 25 sensors', '⭐', 100, 'sensors', 'sensor_count', 25, true),
  ('Sensor Master', 'Added 50 sensors', '👑', 200, 'sensors', 'sensor_count', 50, true),
  ('Sensor Legend', 'Added 100 sensors', '💎', 500, 'sensors', 'sensor_count', 100, true),
  
  -- Streak achievements
  ('Week Warrior', 'Maintained a 7-day streak', '🔥', 40, 'streaks', 'streak_days', 7, true),
  ('Two Week Champion', 'Maintained a 14-day streak', '🔥🔥', 80, 'streaks', 'streak_days', 14, true),
  ('Month Master', 'Maintained a 30-day streak', '👑', 150, 'streaks', 'streak_days', 30, true),
  ('Quarter King', 'Maintained a 90-day streak', '💪', 300, 'streaks', 'streak_days', 90, true),
  ('Half Year Hero', 'Maintained a 180-day streak', '🌟', 500, 'streaks', 'streak_days', 180, true),
  ('Year Legend', 'Maintained a 365-day streak', '🏅', 1000, 'streaks', 'streak_days', 365, true),
  
  -- Successful sensor achievements
  ('Success Starter', '5 successful sensors', '✅', 30, 'success', 'successful_sensor_count', 5, true),
  ('Success Pro', '10 successful sensors', '✨', 60, 'success', 'successful_sensor_count', 10, true),
  ('Success Master', '25 successful sensors', '🌟', 150, 'success', 'successful_sensor_count', 25, true),
  
  -- Level achievements
  ('Level 5 Reached', 'Reached level 5', '🎖️', 50, 'levels', 'level_reached', 5, true),
  ('Level 10 Reached', 'Reached level 10', '🏅', 100, 'levels', 'level_reached', 10, true),
  ('Level 15 Reached', 'Reached level 15', '👑', 200, 'levels', 'level_reached', 15, true),
  ('Level 20 Reached', 'Reached level 20', '💎', 300, 'levels', 'level_reached', 20, true),
  
  -- Glucose tracking achievements
  ('Glucose Tracker', 'Logged 100 glucose readings', '📊', 30, 'glucose', 'glucose_reading_count', 100, true),
  ('Glucose Pro', 'Logged 500 glucose readings', '📈', 100, 'glucose', 'glucose_reading_count', 500, true),
  ('Glucose Master', 'Logged 1000 glucose readings', '📉', 200, 'glucose', 'glucose_reading_count', 1000, true),
  
  -- Food logging achievements
  ('Food Logger', 'Logged 50 meals', '🍽️', 25, 'food', 'food_log_count', 50, true),
  ('Meal Tracker', 'Logged 100 meals', '🍴', 50, 'food', 'food_log_count', 100, true),
  ('Nutrition Expert', 'Logged 250 meals', '🥗', 100, 'food', 'food_log_count', 250, true),
  ('Diet Master', 'Logged 500 meals', '👨‍🍳', 200, 'food', 'food_log_count', 500, true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  points = EXCLUDED.points,
  category = EXCLUDED.category,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  is_active = EXCLUDED.is_active;

-- Drop existing function if it exists (return type changed)
DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
RETURNS TABLE(awarded_achievement_id uuid, achievement_name text) AS $$
DECLARE
    v_stats RECORD;
    v_achievement RECORD;
    v_already_earned boolean;
BEGIN
    -- Get user stats
    SELECT * INTO v_stats
    FROM public.user_gamification_stats
    WHERE user_id = p_user_id;
    
    -- If no stats found, return empty
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check each active achievement
    FOR v_achievement IN 
        SELECT * FROM public.achievements 
        WHERE is_active = true
        ORDER BY requirement_value ASC
    LOOP
        -- Check if user already has this achievement
        SELECT EXISTS (
            SELECT 1 FROM public.user_achievements
            WHERE user_id = p_user_id 
            AND achievement_id = v_achievement.id
        ) INTO v_already_earned;
        
        -- Skip if already earned
        IF v_already_earned THEN
            CONTINUE;
        END IF;
        
        -- Check if requirements are met based on type
        CASE v_achievement.requirement_type
            WHEN 'sensor_count' THEN
                IF COALESCE(v_stats.sensors_tracked, 0) >= v_achievement.requirement_value THEN
                    -- Award achievement
                    INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
                    VALUES (p_user_id, v_achievement.id, NOW());
                    
                    -- Update user stats
                    UPDATE public.user_gamification_stats
                    SET 
                        total_points = total_points + v_achievement.points,
                        achievements_earned = achievements_earned + 1,
                        updated_at = NOW()
                    WHERE user_id = p_user_id;
                    
                    -- Return awarded achievement
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'streak_days' THEN
                IF COALESCE(v_stats.current_streak, 0) >= v_achievement.requirement_value THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
                    VALUES (p_user_id, v_achievement.id, NOW());
                    
                    UPDATE public.user_gamification_stats
                    SET 
                        total_points = total_points + v_achievement.points,
                        achievements_earned = achievements_earned + 1,
                        updated_at = NOW()
                    WHERE user_id = p_user_id;
                    
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'successful_sensor_count' THEN
                IF COALESCE(v_stats.successful_sensors, 0) >= v_achievement.requirement_value THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
                    VALUES (p_user_id, v_achievement.id, NOW());
                    
                    UPDATE public.user_gamification_stats
                    SET 
                        total_points = total_points + v_achievement.points,
                        achievements_earned = achievements_earned + 1,
                        updated_at = NOW()
                    WHERE user_id = p_user_id;
                    
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'level_reached' THEN
                IF COALESCE(v_stats.level, 1) >= v_achievement.requirement_value THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
                    VALUES (p_user_id, v_achievement.id, NOW());
                    
                    UPDATE public.user_gamification_stats
                    SET 
                        total_points = total_points + v_achievement.points,
                        achievements_earned = achievements_earned + 1,
                        updated_at = NOW()
                    WHERE user_id = p_user_id;
                    
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'glucose_reading_count' THEN
                -- Count glucose readings from glucose_readings table
                DECLARE
                    v_glucose_count integer;
                BEGIN
                    SELECT COUNT(*) INTO v_glucose_count
                    FROM public.glucose_readings
                    WHERE user_id = p_user_id;
                    
                    IF v_glucose_count >= v_achievement.requirement_value THEN
                        INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
                        VALUES (p_user_id, v_achievement.id, NOW());
                        
                        UPDATE public.user_gamification_stats
                        SET 
                            total_points = total_points + v_achievement.points,
                            achievements_earned = achievements_earned + 1,
                            updated_at = NOW()
                        WHERE user_id = p_user_id;
                        
                        awarded_achievement_id := v_achievement.id;
                        achievement_name := v_achievement.name;
                        RETURN NEXT;
                    END IF;
                END;
                
            WHEN 'food_log_count' THEN
                -- Count food logs from food_logs table
                DECLARE
                    v_food_count integer;
                BEGIN
                    SELECT COUNT(*) INTO v_food_count
                    FROM public.food_logs
                    WHERE user_id = p_user_id;
                    
                    IF v_food_count >= v_achievement.requirement_value THEN
                        INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
                        VALUES (p_user_id, v_achievement.id, NOW());
                        
                        UPDATE public.user_gamification_stats
                        SET 
                            total_points = total_points + v_achievement.points,
                            achievements_earned = achievements_earned + 1,
                            updated_at = NOW()
                        WHERE user_id = p_user_id;
                        
                        awarded_achievement_id := v_achievement.id;
                        achievement_name := v_achievement.name;
                        RETURN NEXT;
                    END IF;
                END;
            ELSE
                -- Unknown requirement type, skip
                CONTINUE;
        END CASE;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.check_and_award_achievements IS 'Checks user stats and automatically awards any earned achievements';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_and_award_achievements TO authenticated;

-- Run achievement check for all existing users
DO $$
DECLARE
    user_record RECORD;
    awarded_count integer;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT user_id FROM public.user_gamification_stats
    LOOP
        -- Check and award achievements for this user
        SELECT COUNT(*) INTO awarded_count
        FROM public.check_and_award_achievements(user_record.user_id);
        
        IF awarded_count > 0 THEN
            RAISE NOTICE 'Awarded % achievements to user %', awarded_count, user_record.user_id;
        END IF;
    END LOOP;
END $$;
