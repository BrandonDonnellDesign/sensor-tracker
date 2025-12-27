-- Create comprehensive gamification system tables
-- This migration creates all necessary tables for the gamification system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🏆',
    category TEXT NOT NULL DEFAULT 'general',
    points INTEGER NOT NULL DEFAULT 0,
    badge_color TEXT NOT NULL DEFAULT 'bronze',
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL DEFAULT 1,
    requirement_data JSONB DEFAULT '{}',
    is_repeatable BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_id)
);

-- Create user_gamification_stats table
CREATE TABLE IF NOT EXISTS user_gamification_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    sensors_tracked INTEGER DEFAULT 0,
    successful_sensors INTEGER DEFAULT 0,
    achievements_earned INTEGER DEFAULT 0,
    sensors_added INTEGER DEFAULT 0,
    glucose_readings_synced INTEGER DEFAULT 0,
    achievements_unlocked INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_activities table
CREATE TABLE IF NOT EXISTS daily_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_date DATE NOT NULL,
    points_earned INTEGER DEFAULT 0,
    activity_count INTEGER DEFAULT 1,
    activities JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_type, activity_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_stats_user_id ON user_gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_id ON daily_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON daily_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date ON daily_activities(user_id, activity_date);

-- Enable Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only if they don't exist)
DO $$ 
BEGIN
    -- Achievements are readable by all authenticated users
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'achievements' AND policyname = 'Achievements are viewable by authenticated users') THEN
        CREATE POLICY "Achievements are viewable by authenticated users" ON achievements
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    -- Users can only see their own achievements
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can view their own achievements') THEN
        CREATE POLICY "Users can view their own achievements" ON user_achievements
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can insert their own achievements') THEN
        CREATE POLICY "Users can insert their own achievements" ON user_achievements
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can only see their own stats
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_gamification_stats' AND policyname = 'Users can view their own stats') THEN
        CREATE POLICY "Users can view their own stats" ON user_gamification_stats
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_gamification_stats' AND policyname = 'Users can insert their own stats') THEN
        CREATE POLICY "Users can insert their own stats" ON user_gamification_stats
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_gamification_stats' AND policyname = 'Users can update their own stats') THEN
        CREATE POLICY "Users can update their own stats" ON user_gamification_stats
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Users can only see their own activities
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_activities' AND policyname = 'Users can view their own activities') THEN
        CREATE POLICY "Users can view their own activities" ON daily_activities
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_activities' AND policyname = 'Users can insert their own activities') THEN
        CREATE POLICY "Users can insert their own activities" ON daily_activities
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_activities' AND policyname = 'Users can update their own activities') THEN
        CREATE POLICY "Users can update their own activities" ON daily_activities
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, points, badge_color, requirement_type, requirement_value) VALUES
    ('First Steps', 'Add your first sensor', '🎯', 'sensors', 20, 'bronze', 'sensor_count', 1),
    ('Getting Started', 'Track 3 sensors', '🚀', 'sensors', 50, 'bronze', 'sensor_count', 3),
    ('Sensor Tracker', 'Track 5 sensors', '📊', 'sensors', 100, 'silver', 'sensor_count', 5),
    ('Data Master', 'Track 10 sensors', '💎', 'sensors', 200, 'gold', 'sensor_count', 10),
    ('Sensor Expert', 'Track 25 sensors', '👑', 'sensors', 500, 'platinum', 'sensor_count', 25),
    ('Consistency King', 'Maintain a 7-day streak', '🔥', 'streaks', 100, 'silver', 'streak_days', 7),
    ('Streak Master', 'Maintain a 30-day streak', '⚡', 'streaks', 300, 'gold', 'streak_days', 30),
    ('Dedication Legend', 'Maintain a 100-day streak', '🏆', 'streaks', 1000, 'platinum', 'streak_days', 100),
    ('Point Collector', 'Earn 500 total points', '💰', 'points', 0, 'bronze', 'points_total', 500),
    ('Point Master', 'Earn 1000 total points', '💎', 'points', 0, 'silver', 'points_total', 1000),
    ('Point Legend', 'Earn 5000 total points', '👑', 'points', 0, 'gold', 'points_total', 5000)
ON CONFLICT (name) DO NOTHING;

-- Drop and recreate function to check and award achievements
DROP FUNCTION IF EXISTS check_and_award_achievements(UUID);

CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS TABLE(awarded_achievement_id UUID) AS $$
DECLARE
    achievement_record RECORD;
    user_stats RECORD;
    should_award BOOLEAN;
BEGIN
    -- Get current user stats
    SELECT * INTO user_stats FROM user_gamification_stats WHERE user_id = p_user_id;
    
    -- If no stats exist, return empty
    IF user_stats IS NULL THEN
        RETURN;
    END IF;

    -- Loop through all active achievements
    FOR achievement_record IN 
        SELECT * FROM achievements 
        WHERE is_active = TRUE 
        AND id NOT IN (
            SELECT achievement_id FROM user_achievements WHERE user_id = p_user_id
        )
    LOOP
        should_award := FALSE;
        
        -- Check if user meets requirements
        CASE achievement_record.requirement_type
            WHEN 'sensor_count' THEN
                should_award := user_stats.sensors_tracked >= achievement_record.requirement_value;
            WHEN 'streak_days' THEN
                should_award := user_stats.current_streak >= achievement_record.requirement_value;
            WHEN 'points_total' THEN
                should_award := user_stats.total_points >= achievement_record.requirement_value;
            ELSE
                should_award := FALSE;
        END CASE;
        
        -- Award achievement if requirements met
        IF should_award THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (p_user_id, achievement_record.id)
            ON CONFLICT (user_id, achievement_id) DO NOTHING;
            
            -- Update achievements earned count
            UPDATE user_gamification_stats 
            SET achievements_earned = achievements_earned + 1,
                total_points = total_points + achievement_record.points
            WHERE user_id = p_user_id;
            
            -- Return the awarded achievement ID
            awarded_achievement_id := achievement_record.id;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_and_award_achievements(UUID) TO authenticated;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_achievements_updated_at') THEN
        CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_gamification_stats_updated_at') THEN
        CREATE TRIGGER update_user_gamification_stats_updated_at BEFORE UPDATE ON user_gamification_stats
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;