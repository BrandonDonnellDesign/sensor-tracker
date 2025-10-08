-- User Features Migration
-- Contains gamification system, notifications, and user engagement features
-- Migration: 20251008000002_user_features.sql

-- ============================================================================
-- GAMIFICATION SYSTEM
-- ============================================================================

-- Achievement definitions table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'tracking', 'consistency', 'milestone', 'special'
  points INTEGER NOT NULL DEFAULT 0,
  badge_color VARCHAR(20) DEFAULT 'blue', -- 'bronze', 'silver', 'gold', 'platinum', 'special'
  requirement_type VARCHAR(50) NOT NULL, -- 'sensor_count', 'streak_days', 'success_rate', 'special_action'
  requirement_value INTEGER, -- threshold value for achievement
  requirement_data JSONB, -- additional requirement parameters
  is_repeatable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements (earned achievements)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_data JSONB, -- stores progress details when earned
  UNIQUE(user_id, achievement_id) -- prevent duplicate achievements (unless repeatable)
);

-- User gamification stats
CREATE TABLE IF NOT EXISTS public.user_gamification_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  sensors_tracked INTEGER DEFAULT 0,
  successful_sensors INTEGER DEFAULT 0,
  achievements_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily activity tracking for streaks
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activities JSONB NOT NULL DEFAULT '[]', -- array of activities done that day
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

-- Notification templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- 'sensor_expiry_warning', 'achievement_unlock', etc.
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ab_test_group VARCHAR(20), -- for A/B testing different templates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  delivery_status VARCHAR(20) DEFAULT 'undelivered', -- 'undelivered', 'delivered', 'read'
  template_id UUID REFERENCES public.notification_templates(id),
  template_variant VARCHAR(20), -- for A/B testing
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON public.user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS idx_user_gamification_stats_user_id ON public.user_gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_id ON public.daily_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON public.daily_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON public.notifications(scheduled_for);

-- Add unique constraint on achievement name for upsert capability
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'achievements_name_unique'
    ) THEN
        ALTER TABLE public.achievements ADD CONSTRAINT achievements_name_unique UNIQUE (name);
    END IF;
END $;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (readable by all authenticated users)
CREATE POLICY "Achievements are viewable by authenticated users" ON public.achievements
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for user achievements (users can only see their own)
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user gamification stats
CREATE POLICY "Users can view own gamification stats" ON public.user_gamification_stats
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for daily activities
CREATE POLICY "Users can view own daily activities" ON public.daily_activities
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for notification templates (readable by all)
CREATE POLICY "Notification templates are viewable by authenticated users" ON public.notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- DEFAULT ACHIEVEMENTS
-- ============================================================================

INSERT INTO public.achievements (name, description, icon, category, points, badge_color, requirement_type, requirement_value, requirement_data) VALUES
-- Sensor Tracking Milestones
('First Sensor', 'Add your first CGM sensor to the tracker', '🩺', 'tracking', 50, 'bronze', 'sensor_count', 1, '{}'),
('Getting Started', 'Track 5 CGM sensors', '📊', 'tracking', 100, 'bronze', 'sensor_count', 5, '{}'),
('Experienced User', 'Track 15 CGM sensors', '🎯', 'tracking', 200, 'silver', 'sensor_count', 15, '{}'),
('Sensor Veteran', 'Track 30 CGM sensors', '🏆', 'tracking', 400, 'silver', 'sensor_count', 30, '{}'),
('Tracking Expert', 'Track 50 CGM sensors', '👑', 'tracking', 750, 'gold', 'sensor_count', 50, '{}'),
('Sensor Master', 'Track 100 CGM sensors', '⭐', 'tracking', 1500, 'platinum', 'sensor_count', 100, '{}'),

-- Reliability & Success Rate
('Reliable User', 'Achieve 80% sensor success rate (min 10 sensors)', '✅', 'milestone', 200, 'bronze', 'success_rate', 80, '{"min_sensors": 10}'),
('Quality Tracker', 'Achieve 90% success rate (min 20 sensors)', '🎯', 'milestone', 400, 'silver', 'success_rate', 90, '{"min_sensors": 20}'),
('Perfect Record', 'Achieve 95% success rate (min 30 sensors)', '💎', 'milestone', 800, 'gold', 'success_rate', 95, '{"min_sensors": 30}'),

-- Consistency & Engagement
('Daily User', 'Use the app for 7 consecutive days', '🔥', 'consistency', 150, 'bronze', 'streak_days', 7, '{}'),
('Committed Tracker', 'Maintain a 14-day usage streak', '💪', 'consistency', 300, 'silver', 'streak_days', 14, '{}'),
('Dedicated User', 'Achieve a 30-day streak', '🎖️', 'consistency', 600, 'gold', 'streak_days', 30, '{}'),
('Unstoppable', 'Reach a 60-day streak', '🚀', 'consistency', 1200, 'platinum', 'streak_days', 60, '{}'),

-- Issue Management & Documentation
('Problem Solver', 'Tag 5 sensors with issue categories', '🏷️', 'special', 100, 'bronze', 'special_action', 1, '{"action_type": "tag_issues", "required_count": 5}'),
('Detail Oriented', 'Add detailed notes to 10 sensors', '📝', 'special', 150, 'bronze', 'special_action', 2, '{"action_type": "detailed_notes", "required_count": 10}'),
('Issue Tracker', 'Document problems on 15 sensors', '🔍', 'special', 200, 'silver', 'special_action', 3, '{"action_type": "issue_documentation", "required_count": 15}'),

-- Technology Integration
('Tech Savvy', 'Connect external integrations', '🔗', 'special', 300, 'gold', 'special_action', 4, '{"action_type": "integration_setup"}'),
('Auto Sync Pro', 'Successfully sync 10 sensors via API', '⚡', 'special', 250, 'silver', 'special_action', 5, '{"action_type": "auto_sync", "required_count": 10}'),

-- Long-term Usage & Reliability
('Long-term User', 'Track sensors for 6 months continuously', '📅', 'special', 300, 'silver', 'special_action', 6, '{"action_type": "long_term_usage", "required_months": 6}'),
('Sensor Optimizer', 'Achieve 90%+ of expected sensor lifespan on average', '⏱️', 'special', 250, 'gold', 'special_action', 7, '{"action_type": "sensor_longevity", "required_percentage": 90}'),

-- Maintenance & Organization
('Organized User', 'Archive 20 expired sensors', '📦', 'special', 150, 'bronze', 'special_action', 8, '{"action_type": "archive_sensors", "required_count": 20}'),
('Clean Tracker', 'Maintain organized sensor history for 90 days', '🧹', 'special', 400, 'gold', 'special_action', 9, '{"action_type": "maintenance_streak", "required_days": 90}'),
('Perfect Usage', 'Get full lifespan from 10 consecutive sensors', '💎', 'special', 500, 'platinum', 'special_action', 10, '{"action_type": "perfect_usage", "required_consecutive": 10}')
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
-- DEFAULT NOTIFICATION TEMPLATES
-- ============================================================================

INSERT INTO public.notification_templates (name, type, title_template, message_template) VALUES
('sensor_expiry_warning', 'sensor_expiry_warning', 
 'Sensor Expiring Soon!', 
 'Your sensor will expire in {{daysLeft}} days. Please prepare a replacement to continue monitoring.'),
('achievement_unlock', 'achievement_unlock',
 'Achievement Unlocked: {{achievementName}}!',
 'Congratulations! You''ve earned {{points}} points for {{achievementDescription}}'),
('streak_milestone', 'streak_milestone',
 '🔥 {{streakDays}} Day Streak!',
 'Amazing! You''ve maintained your tracking streak for {{streakDays}} consecutive days. Keep it up!'),
('sensor_issue_reminder', 'sensor_issue_reminder',
 'Sensor Issue Detected',
 'We noticed you marked a sensor as problematic. Consider documenting the issue for better tracking.')
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  updated_at = NOW();