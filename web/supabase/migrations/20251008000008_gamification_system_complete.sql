-- ============================================================================ 
-- Complete Gamification System Migration
-- Consolidates all gamification fixes and enhancements
-- Migration: 20251008000008_gamification_system_complete.sql
-- ============================================================================

-- ============================================================================
-- ACHIEVEMENT CHECKING FUNCTION (with streak support and hidden achievements)
-- ============================================================================

DROP FUNCTION IF EXISTS check_and_award_achievements(UUID);

CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS TABLE(awarded_achievement_id UUID, awarded_achievement_name VARCHAR, awarded_points INTEGER) AS $$
DECLARE
    user_stats RECORD;
    achievement RECORD;
BEGIN
    -- Get current user stats
    SELECT * INTO user_stats 
    FROM public.user_gamification_stats 
    WHERE user_id = p_user_id;

    -- If no stats exist, create them
    IF user_stats IS NULL THEN
        INSERT INTO public.user_gamification_stats (user_id) VALUES (p_user_id);
        SELECT * INTO user_stats FROM public.user_gamification_stats WHERE user_id = p_user_id;
    END IF;

    -- =============================
    -- SENSOR COUNT ACHIEVEMENTS
    -- =============================
    FOR achievement IN 
        SELECT * FROM public.achievements 
        WHERE requirement_type = 'sensor_count' 
          AND is_active = true
          AND requirement_value <= user_stats.sensors_tracked
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id) THEN
            INSERT INTO public.user_achievements (user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object(
                'sensors_tracked', user_stats.sensors_tracked,
                'awarded_for', 'sensor_count'
            ));

            UPDATE public.user_gamification_stats 
            SET 
                total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            awarded_achievement_id := achievement.id;
            awarded_achievement_name := achievement.name;
            awarded_points := achievement.points;
            RETURN NEXT;
        END IF;
    END LOOP;

    -- =============================
    -- STREAK ACHIEVEMENTS
    -- =============================
    FOR achievement IN 
        SELECT * FROM public.achievements 
        WHERE requirement_type = 'streak_days' 
          AND is_active = true
          AND requirement_value <= GREATEST(user_stats.current_streak, user_stats.longest_streak)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id) THEN
            INSERT INTO public.user_achievements (user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object(
                'current_streak', user_stats.current_streak,
                'longest_streak', user_stats.longest_streak,
                'awarded_for', 'streak_days'
            ));

            UPDATE public.user_gamification_stats 
            SET 
                total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            awarded_achievement_id := achievement.id;
            awarded_achievement_name := achievement.name;
            awarded_points := achievement.points;
            RETURN NEXT;
        END IF;
    END LOOP;

    -- =============================
    -- SUCCESS RATE ACHIEVEMENTS
    -- =============================
    FOR achievement IN 
        SELECT * FROM public.achievements 
        WHERE requirement_type = 'success_rate' 
          AND is_active = true
    LOOP
        IF user_stats.sensors_tracked >= 10 THEN
            DECLARE
                success_rate NUMERIC;
            BEGIN
                success_rate := (user_stats.successful_sensors::NUMERIC / user_stats.sensors_tracked::NUMERIC) * 100;

                IF success_rate >= achievement.requirement_value
                   AND user_stats.sensors_tracked >= COALESCE((achievement.requirement_data->>'min_sensors')::INTEGER, 10)
                   AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
                THEN
                    INSERT INTO public.user_achievements (user_id, achievement_id, progress_data)
                    VALUES (p_user_id, achievement.id, jsonb_build_object(
                        'success_rate', success_rate,
                        'sensors_tracked', user_stats.sensors_tracked,
                        'awarded_for', 'success_rate'
                    ));

                    UPDATE public.user_gamification_stats 
                    SET 
                        total_points = total_points + achievement.points,
                        achievements_earned = achievements_earned + 1,
                        updated_at = NOW()
                    WHERE user_id = p_user_id;

                    awarded_achievement_id := achievement.id;
                    awarded_achievement_name := achievement.name;
                    awarded_points := achievement.points;
                    RETURN NEXT;
                END IF;
            END;
        END IF;
    END LOOP;

    -- =============================
    -- HIDDEN ACHIEVEMENTS
    -- =============================
    FOR achievement IN
        SELECT * FROM public.achievements
        WHERE requirement_type = 'hidden_trigger'
          AND is_active = true
    LOOP
        -- Hidden Gem
        IF achievement.name = 'Hidden Gem' AND user_stats.sensors_tracked >= 1
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('sensors_tracked', user_stats.sensors_tracked));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- The Scientist
        IF achievement.name = 'The Scientist' AND COALESCE(user_stats.analytics_views, 0) >= 10
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('analytics_views', COALESCE(user_stats.analytics_views, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- Smooth Operator
        IF achievement.name = 'Smooth Operator' AND COALESCE(user_stats.stable_sensors, 0) >= 10
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('stable_sensors', COALESCE(user_stats.stable_sensors, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- The Archivist
        IF achievement.name = 'The Archivist' AND COALESCE(user_stats.archived_sensors, 0) >= 50
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('archived_sensors', COALESCE(user_stats.archived_sensors, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- Early Adopter
        IF achievement.name = 'Early Adopter' AND COALESCE(user_stats.account_age_days, 999) <= 30
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('account_age_days', COALESCE(user_stats.account_age_days, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- Perfectionist
        IF achievement.name = 'Perfectionist' AND COALESCE(user_stats.sensor_edits, 0) >= 5
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('sensor_edits', COALESCE(user_stats.sensor_edits, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- Tag Wizard
        IF achievement.name = 'Tag Wizard' AND COALESCE(user_stats.tags_used, 0) >= 8
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('tags_used', COALESCE(user_stats.tags_used, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- Data Hoarder
        IF achievement.name = 'Data Hoarder' AND COALESCE(user_stats.sensors_total, user_stats.sensors_tracked) >= 200
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('sensors_total', COALESCE(user_stats.sensors_total, user_stats.sensors_tracked)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- The Curator
        IF achievement.name = 'The Curator' AND COALESCE(user_stats.photos_added, 0) >= 20
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('photos_added', COALESCE(user_stats.photos_added, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- Meta Explorer
        IF achievement.name = 'Meta Explorer' AND COALESCE(user_stats.page_visited, 0) >= 1
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('page_visited', COALESCE(user_stats.page_visited, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

        -- Completionist
        IF achievement.name = 'Completionist' AND COALESCE(user_stats.achievement_completion, 0) >= 100
           AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = achievement.id)
        THEN
            INSERT INTO public.user_achievements(user_id, achievement_id, progress_data)
            VALUES (p_user_id, achievement.id, jsonb_build_object('achievement_completion', COALESCE(user_stats.achievement_completion, 0)));
            UPDATE public.user_gamification_stats 
            SET total_points = total_points + achievement.points,
                achievements_earned = achievements_earned + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            awarded_achievement_id := achievement.id; awarded_achievement_name := achievement.name; awarded_points := achievement.points;
            RETURN NEXT;
        END IF;

    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================ 
-- ENHANCED DAILY ACTIVITY TRACKING (with milestone bonuses)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_daily_activity(p_user_id UUID, p_activity VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
    user_stats RECORD;
    current_activities JSONB;
    new_streak INTEGER;
    milestone_bonus INTEGER := 0;
BEGIN
    SELECT activities INTO current_activities
    FROM public.daily_activities
    WHERE user_id = p_user_id AND activity_date = today_date;

    IF current_activities IS NULL THEN
        current_activities := '[]'::jsonb;
    END IF;

    IF NOT current_activities ? p_activity THEN
        current_activities := current_activities || jsonb_build_array(p_activity);

        INSERT INTO public.daily_activities (user_id, activity_date, activities, points_earned)
        VALUES (p_user_id, today_date, current_activities, 10)
        ON CONFLICT (user_id, activity_date) DO UPDATE SET
            activities = current_activities,
            points_earned = daily_activities.points_earned + 10;

        SELECT * INTO user_stats FROM public.user_gamification_stats WHERE user_id = p_user_id;

        IF user_stats.last_activity_date = yesterday_date THEN
            new_streak := user_stats.current_streak + 1;
        ELSIF user_stats.last_activity_date != today_date THEN
            new_streak := 1;
        ELSE
            new_streak := user_stats.current_streak;
        END IF;

        IF new_streak = 3 AND user_stats.current_streak < 3 THEN
            milestone_bonus := 25;
        ELSIF new_streak = 7 AND user_stats.current_streak < 7 THEN
            milestone_bonus := 50;
        ELSIF new_streak = 14 AND user_stats.current_streak < 14 THEN
            milestone_bonus := 100;
        ELSIF new_streak = 30 AND user_stats.current_streak < 30 THEN
            milestone_bonus := 200;
        ELSIF new_streak = 60 AND user_stats.current_streak < 60 THEN
            milestone_bonus := 400;
        ELSIF new_streak = 100 AND user_stats.current_streak < 100 THEN
            milestone_bonus := 1000;
        END IF;

        UPDATE public.user_gamification_stats 
        SET 
            current_streak = new_streak,
            longest_streak = GREATEST(longest_streak, new_streak),
            last_activity_date = today_date,
            total_points = total_points + 10 + milestone_bonus,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        IF milestone_bonus > 0 THEN
            UPDATE public.daily_activities 
            SET 
                points_earned = points_earned + milestone_bonus,
                activities = activities || jsonb_build_array(CONCAT('streak_milestone_', new_streak, '_days'))
            WHERE user_id = p_user_id AND activity_date = today_date;

            RAISE NOTICE 'Streak milestone bonus awarded: % days = % points', new_streak, milestone_bonus;
        END IF;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================ 
-- ENHANCED SENSOR TRACKING (with proper triggers)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_gamification_stats_insert ON public.sensors;
DROP TRIGGER IF EXISTS trigger_update_gamification_stats_update ON public.sensors;
DROP TRIGGER IF EXISTS trigger_update_gamification_stats_delete ON public.sensors;

CREATE OR REPLACE FUNCTION update_gamification_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_deleted = false THEN
            INSERT INTO public.user_gamification_stats (user_id, sensors_tracked, successful_sensors)
            VALUES (
                NEW.user_id,
                1,
                CASE WHEN NEW.is_problematic = false THEN 1 ELSE 0 END
            )
            ON CONFLICT (user_id) DO UPDATE SET
                sensors_tracked = user_gamification_stats.sensors_tracked + 1,
                successful_sensors = user_gamification_stats.successful_sensors + 
                    CASE WHEN NEW.is_problematic = false THEN 1 ELSE 0 END,
                updated_at = NOW();
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        UPDATE public.user_gamification_stats 
        SET 
            sensors_tracked = (
                SELECT COUNT(*) FROM public.sensors WHERE user_id = NEW.user_id AND is_deleted = false
            ),
            successful_sensors = (
                SELECT COUNT(*) FROM public.sensors WHERE user_id = NEW.user_id AND is_deleted = false AND is_problematic = false
            ),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE public.user_gamification_stats 
        SET 
            sensors_tracked = (
                SELECT COUNT(*) FROM public.sensors WHERE user_id = OLD.user_id AND is_deleted = false
            ),
            successful_sensors = (
                SELECT COUNT(*) FROM public.sensors WHERE user_id = OLD.user_id AND is_deleted = false AND is_problematic = false
            ),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_gamification_stats_insert
  AFTER INSERT ON public.sensors
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_stats();

CREATE TRIGGER trigger_update_gamification_stats_update
  AFTER UPDATE ON public.sensors
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_stats();

CREATE TRIGGER trigger_update_gamification_stats_delete
  AFTER DELETE ON public.sensors
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_stats();

-- ============================================================================ 
-- UPDATED STREAK ACHIEVEMENTS (with better points and descriptions)
-- ============================================================================

-- Update existing streak achievements or insert if they don't exist
INSERT INTO public.achievements (name, description, icon, category, points, badge_color, requirement_type, requirement_value, requirement_data) VALUES
('First Streak', 'Achieve a 3-day login streak and earn your first milestone bonus (+25 points)', '🔥', 'consistency', 75, 'bronze', 'streak_days', 3, '{}'),
('Weekly Champion', 'Maintain a 7-day login streak and unlock weekly milestone bonuses (+50 points)', '🔥', 'consistency', 150, 'silver', 'streak_days', 7, '{}'),
('Streak Master', 'Achieve a 14-day streak and unlock bi-weekly milestone bonuses (+100 points)', '🔥', 'consistency', 300, 'gold', 'streak_days', 14, '{}'),
('Consistency Legend', 'Reach a 30-day streak and unlock monthly milestone bonuses (+200 points)', '🔥', 'consistency', 600, 'platinum', 'streak_days', 30, '{}')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  points = EXCLUDED.points,
  badge_color = EXCLUDED.badge_color,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  requirement_data = EXCLUDED.requirement_data,
  updated_at = NOW();

INSERT INTO public.achievements (name, description, icon, category, points, badge_color, requirement_type, requirement_value, requirement_data) VALUES
('Streak Veteran', 'Achieve an incredible 60-day streak and unlock veteran bonuses (+400 points)', '🔥', 'consistency', 1000, 'platinum', 'streak_days', 60, '{}'),
('Streak Legend', 'Reach the legendary 100-day streak milestone (+1000 points)', '👑', 'consistency', 2000, 'platinum', 'streak_days', 100, '{}')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  points = EXCLUDED.points,
  badge_color = EXCLUDED.badge_color,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  requirement_data = EXCLUDED.requirement_data,
  updated_at = NOW();

-- ============================================================================ 
-- DATA MIGRATION AND CLEANUP
-- ============================================================================

UPDATE public.user_gamification_stats 
SET 
  sensors_tracked = subquery.total_sensors,
  successful_sensors = subquery.successful_sensors,
  updated_at = NOW()
FROM (
  SELECT 
    user_id,
    COUNT(*) as total_sensors,
    COUNT(*) FILTER (WHERE is_problematic = false) as successful_sensors
  FROM public.sensors 
  WHERE is_deleted = false
  GROUP BY user_id
) AS subquery
WHERE user_gamification_stats.user_id = subquery.user_id;

-- ============================================================================ 
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Gamification system migration completed successfully!';
    RAISE NOTICE 'Features updated:';
    RAISE NOTICE '- Achievement checking with streak support';
    RAISE NOTICE '- Hidden achievements implemented';
    RAISE NOTICE '- Daily activity tracking with milestone bonuses';
    RAISE NOTICE '- Enhanced sensor tracking with proper triggers';
    RAISE NOTICE '- Updated streak achievements with better rewards';
    RAISE NOTICE '- Data migration and cleanup completed';
END $$;
-
- ============================================================================ 
-- HIDDEN ACHIEVEMENT COLUMNS
-- ============================================================================

-- Add missing columns to user_gamification_stats table for hidden achievements
ALTER TABLE public.user_gamification_stats 
ADD COLUMN IF NOT EXISTS analytics_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stable_sensors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS archived_sensors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_age_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sensor_edits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sensors_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS photos_added INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS page_visited INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS achievement_completion INTEGER DEFAULT 0;

-- Update existing records to set sensors_total = sensors_tracked
UPDATE public.user_gamification_stats 
SET sensors_total = sensors_tracked
WHERE sensors_total = 0;

-- Update account_age_days for existing users (days since they first added a sensor)
UPDATE public.user_gamification_stats 
SET account_age_days = EXTRACT(DAY FROM (NOW() - (
    SELECT MIN(created_at) 
    FROM public.sensors 
    WHERE sensors.user_id = user_gamification_stats.user_id
)))::INTEGER
WHERE account_age_days = 0;

-- Calculate achievement completion percentage for existing users
UPDATE public.user_gamification_stats 
SET achievement_completion = CASE 
    WHEN (SELECT COUNT(*) FROM public.achievements WHERE is_active = true AND requirement_type != 'hidden_trigger') > 0
    THEN ROUND((achievements_earned::NUMERIC / (SELECT COUNT(*) FROM public.achievements WHERE is_active = true AND requirement_type != 'hidden_trigger')::NUMERIC) * 100)
    ELSE 0
END
WHERE achievement_completion = 0;

-- ============================================================================ 
-- HIDDEN & SPECIAL ACHIEVEMENTS
-- ============================================================================

-- Insert all hidden and special achievements
INSERT INTO public.achievements
(name, description, icon, category, points, badge_color, requirement_type, requirement_value, requirement_data, is_repeatable, is_active, created_at, updated_at)
VALUES
('Detail Oriented', 'Add detailed notes to 10 sensors', '📝', 'special', 150, 'bronze', 'special_action', 2, '{"action_type": "detailed_notes", "required_count": 10}', false, true, NOW(), NOW()),
('Sensor Optimizer', 'Achieve 90%+ of expected sensor lifespan on average', '⏱️', 'special', 250, 'gold', 'special_action', 7, '{"action_type": "sensor_longevity", "required_percentage": 90}', false, true, NOW(), NOW()),
('Perfect Usage', 'Get full lifespan from 10 consecutive sensors', '💎', 'special', 500, 'platinum', 'special_action', 10, '{"action_type": "perfect_usage", "required_consecutive": 10}', false, true, NOW(), NOW()),
('Tech Savvy', 'Connect Dexcom API integration', '🔗', 'special', 300, 'gold', 'special_action', 4, '{"action_type": "dexcom_integration"}', false, true, NOW(), NOW()),
('Auto Sync Pro', 'Successfully sync 10 sensors via Dexcom API', '⚡', 'special', 250, 'silver', 'special_action', 5, '{"action_type": "auto_sync", "required_count": 10}', false, true, NOW(), NOW()),
('Problem Solver', 'Tag 5 sensors with issue categories', '🏷️', 'special', 100, 'bronze', 'special_action', 1, '{"action_type": "tag_issues", "required_count": 5}', false, true, NOW(), NOW()),
('Issue Tracker', 'Document problems on 15 sensors', '🔍', 'special', 200, 'silver', 'special_action', 3, '{"action_type": "issue_documentation", "required_count": 15}', false, true, NOW(), NOW()),
('Organized User', 'Archive 20 expired sensors', '📦', 'special', 150, 'bronze', 'special_action', 8, '{"action_type": "archive_sensors", "required_count": 20}', false, true, NOW(), NOW()),
('Clean Tracker', 'Maintain organized sensor history for 90 days', '🧹', 'special', 400, 'gold', 'special_action', 9, '{"action_type": "maintenance_streak", "required_days": 90}', false, true, NOW(), NOW()),
('Long-term User', 'Track sensors for 6 months continuously', '📅', 'special', 300, 'silver', 'special_action', 6, '{"action_type": "long_term_usage", "required_months": 6}', false, true, NOW(), NOW()),
('Hidden Gem', 'You discovered one of SensorTracker''s secret achievements!', '💎', 'mystery', 200, 'purple', 'hidden_trigger', 1, '{}', false, true, NOW(), NOW()),
('The Scientist', 'Viewed analytics 10 times — curiosity rewarded!', '🔬', 'analytics', 150, 'blue', 'hidden_trigger', 10, '{}', false, true, NOW(), NOW()),
('Smooth Operator', 'Maintained 10 stable sensors without issues.', '⚡', 'performance', 200, 'blue', 'hidden_trigger', 10, '{}', false, true, NOW(), NOW()),
('The Archivist', 'Archived 50 sensors — a master of organization.', '📚', 'organization', 250, 'amber', 'hidden_trigger', 50, '{}', false, true, NOW(), NOW()),
('Early Adopter', 'Joined SensorTracker during its launch window.', '🚀', 'meta', 300, 'blue', 'hidden_trigger', 30, '{}', false, true, NOW(), NOW()),
('Perfectionist', 'Edited the same sensor''s info 5 times.', '🧩', 'detail', 150, 'orange', 'hidden_trigger', 5, '{}', false, true, NOW(), NOW()),
('Tag Wizard', 'Used all available tag types at least once.', '🏷️', 'organization', 200, 'green', 'hidden_trigger', 8, '{}', false, true, NOW(), NOW()),
('Data Hoarder', 'Stored 200+ sensors.', '💾', 'organization', 400, 'gray', 'hidden_trigger', 200, '{}', false, true, NOW(), NOW()),
('The Curator', 'Added photos to 20+ sensors.', '🖼️', 'media', 250, 'purple', 'hidden_trigger', 20, '{}', false, true, NOW(), NOW()),
('Meta Explorer', 'Visited the About or Changelog section.', '🌐', 'meta', 100, 'gray', 'hidden_trigger', 1, '{}', false, true, NOW(), NOW()),
('Completionist', 'Unlocked every visible (non-hidden) achievement.', '🏅', 'meta', 500, 'gold', 'hidden_trigger', 100, '{}', false, true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  points = EXCLUDED.points,
  badge_color = EXCLUDED.badge_color,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  requirement_data = EXCLUDED.requirement_data,
  is_repeatable = EXCLUDED.is_repeatable,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================ 
-- FINAL COMPLETION MESSAGE
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE '🎉 COMPLETE GAMIFICATION SYSTEM READY! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE 'All features implemented:';
    RAISE NOTICE '✅ Achievement checking with streak support and hidden achievements';
    RAISE NOTICE '✅ Daily activity tracking with milestone bonuses';
    RAISE NOTICE '✅ Enhanced sensor tracking with proper triggers';
    RAISE NOTICE '✅ Updated streak achievements with better rewards';
    RAISE NOTICE '✅ Hidden achievement columns and tracking';
    RAISE NOTICE '✅ Special achievements for future features';
    RAISE NOTICE '✅ Data migration and cleanup completed';
    RAISE NOTICE '';
    RAISE NOTICE 'Hidden achievement columns: analytics_views, stable_sensors, archived_sensors,';
    RAISE NOTICE '                           account_age_days, sensor_edits, tags_used,';
    RAISE NOTICE '                           sensors_total, photos_added, page_visited, achievement_completion';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to award achievements! 🏆';
END $;