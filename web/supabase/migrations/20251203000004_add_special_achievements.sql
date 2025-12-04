-- Add calculation logic for existing special achievements
-- This updates the check_and_award_achievements function to handle all achievement types

-- Drop existing function to recreate with new logic
DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);
DROP FUNCTION IF EXISTS public.award_achievement(uuid, uuid, integer);

-- Helper function to award achievement and update stats
CREATE OR REPLACE FUNCTION award_achievement(p_user_id uuid, p_achievement_id uuid, p_points integer)
RETURNS void AS $$
BEGIN
    -- Insert achievement
    INSERT INTO public.user_achievements (user_id, achievement_id, earned_at)
    VALUES (p_user_id, p_achievement_id, NOW());
    
    -- Update user stats
    UPDATE public.user_gamification_stats
    SET 
        total_points = total_points + p_points,
        achievements_earned = achievements_earned + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Main achievement checking function with all logic
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
RETURNS TABLE(awarded_achievement_id uuid, achievement_name text) AS $$
DECLARE
    v_stats RECORD;
    v_achievement RECORD;
    v_already_earned boolean;
    v_count integer;
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
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'streak_days' THEN
                IF COALESCE(v_stats.current_streak, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'successful_sensor_count' THEN
                IF COALESCE(v_stats.successful_sensors, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'level_reached' THEN
                IF COALESCE(v_stats.level, 1) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'analytics_view_count' THEN
                IF COALESCE(v_stats.analytics_views, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'archived_sensor_count' THEN
                IF COALESCE(v_stats.archived_sensors, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'tag_variety_count' THEN
                IF COALESCE(v_stats.tags_used, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'page_visit_count' THEN
                IF COALESCE(v_stats.page_visited, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'account_age_days' THEN
                IF COALESCE(v_stats.account_age_days, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'sensor_edit_count' THEN
                IF COALESCE(v_stats.sensor_edits, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'sensor_with_photos_count' THEN
                IF COALESCE(v_stats.photos_added, 0) >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'problematic_sensor_count' THEN
                -- Count sensors marked as problematic
                SELECT COUNT(*) INTO v_count
                FROM public.sensors
                WHERE user_id = p_user_id 
                AND is_problematic = true
                AND is_deleted = false;
                
                IF v_count >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'sensor_with_notes_count' THEN
                -- Count sensors with notes
                SELECT COUNT(*) INTO v_count
                FROM public.sensors
                WHERE user_id = p_user_id 
                AND notes IS NOT NULL 
                AND notes != ''
                AND is_deleted = false;
                
                IF v_count >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'dexcom_connected' THEN
                -- Check if user has Dexcom token
                SELECT EXISTS (
                    SELECT 1 FROM public.dexcom_tokens
                    WHERE user_id = p_user_id
                ) INTO v_already_earned;
                
                IF v_already_earned THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'dexcom_sync_count' THEN
                -- Count successful Dexcom syncs
                SELECT COUNT(*) INTO v_count
                FROM public.dexcom_sync_log
                WHERE user_id = p_user_id 
                AND status = 'success';
                
                IF v_count >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'glucose_reading_count' THEN
                -- Count glucose readings
                SELECT COUNT(*) INTO v_count
                FROM public.glucose_readings
                WHERE user_id = p_user_id;
                
                IF v_count >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
                
            WHEN 'food_log_count' THEN
                -- Count food logs
                SELECT COUNT(*) INTO v_count
                FROM public.food_logs
                WHERE user_id = p_user_id;
                
                IF v_count >= v_achievement.requirement_value THEN
                    PERFORM award_achievement(p_user_id, v_achievement.id, v_achievement.points);
                    awarded_achievement_id := v_achievement.id;
                    achievement_name := v_achievement.name;
                    RETURN NEXT;
                END IF;
            ELSE
                -- Unknown requirement type, skip
                CONTINUE;
        END CASE;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.check_and_award_achievements IS 'Checks user stats and awards achievements for all types including special achievements';
COMMENT ON FUNCTION award_achievement IS 'Helper function to award an achievement and update user stats';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_and_award_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION award_achievement TO authenticated;

-- Run achievement check for all existing users to award any earned achievements
DO $$
DECLARE
    user_record RECORD;
    awarded_count integer;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT user_id FROM public.user_gamification_stats
    LOOP
        SELECT COUNT(*) INTO awarded_count
        FROM public.check_and_award_achievements(user_record.user_id);
        
        IF awarded_count > 0 THEN
            RAISE NOTICE 'Awarded % new achievements to user %', awarded_count, user_record.user_id;
        END IF;
    END LOOP;
END $$;
