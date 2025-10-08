-- Admin System Migration
-- Contains admin functionality, security, and management features
-- Migration: 20251008000003_admin_system.sql

-- ============================================================================
-- ADMIN TABLES
-- ============================================================================

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin', 'super_admin', 'moderator'
  permissions JSONB DEFAULT '[]', -- array of specific permissions
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50), -- 'user', 'sensor', 'achievement', etc.
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System metrics table
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'counter', 'gauge', 'histogram'
  tags JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  category VARCHAR(50), -- 'system', 'user_activity', 'security', etc.
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- GAMIFICATION ADMIN FUNCTIONS
-- ============================================================================

-- Function to update user stats when sensors are added/updated
CREATE OR REPLACE FUNCTION update_gamification_stats()
RETURNS TRIGGER AS $
BEGIN
  -- Update or insert user gamification stats
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

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id UUID, achievement_name VARCHAR, points_earned INTEGER) AS $
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

  -- Check sensor count achievements
  FOR achievement IN 
    SELECT * FROM public.achievements 
    WHERE requirement_type = 'sensor_count' 
    AND is_active = true
    AND requirement_value <= user_stats.sensors_tracked
  LOOP
    -- Check if user already has this achievement
    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements 
      WHERE user_id = p_user_id AND achievement_id = achievement.id
    ) THEN
      -- Award the achievement
      INSERT INTO public.user_achievements (user_id, achievement_id, progress_data)
      VALUES (p_user_id, achievement.id, jsonb_build_object(
        'sensors_tracked', user_stats.sensors_tracked,
        'awarded_for', 'sensor_count'
      ));

      -- Update user points and achievement count
      UPDATE public.user_gamification_stats 
      SET 
        total_points = total_points + achievement.points,
        achievements_earned = achievements_earned + 1,
        updated_at = NOW()
      WHERE user_id = p_user_id;

      -- Return the awarded achievement
      achievement_id := achievement.id;
      achievement_name := achievement.name;
      points_earned := achievement.points;
      RETURN NEXT;
    END IF;
  END LOOP;

  -- Check success rate achievements
  FOR achievement IN 
    SELECT * FROM public.achievements 
    WHERE requirement_type = 'success_rate' 
    AND is_active = true
  LOOP
    -- Calculate success rate
    IF user_stats.sensors_tracked >= 10 THEN
      DECLARE
        success_rate NUMERIC;
      BEGIN
        success_rate := (user_stats.successful_sensors::NUMERIC / user_stats.sensors_tracked::NUMERIC) * 100;
        
        IF success_rate >= achievement.requirement_value 
        AND user_stats.sensors_tracked >= COALESCE((achievement.requirement_data->>'min_sensors')::INTEGER, 10)
        AND NOT EXISTS (
          SELECT 1 FROM public.user_achievements 
          WHERE user_id = p_user_id AND achievement_id = achievement.id
        ) THEN
          -- Award the achievement
          INSERT INTO public.user_achievements (user_id, achievement_id, progress_data)
          VALUES (p_user_id, achievement.id, jsonb_build_object(
            'success_rate', success_rate,
            'sensors_tracked', user_stats.sensors_tracked,
            'awarded_for', 'success_rate'
          ));

          -- Update user points
          UPDATE public.user_gamification_stats 
          SET 
            total_points = total_points + achievement.points,
            achievements_earned = achievements_earned + 1,
            updated_at = NOW()
          WHERE user_id = p_user_id;

          -- Return the awarded achievement
          achievement_id := achievement.id;
          achievement_name := achievement.name;
          points_earned := achievement.points;
          RETURN NEXT;
        END IF;
      END;
    END IF;
  END LOOP;

  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily activity and streaks
CREATE OR REPLACE FUNCTION update_daily_activity(p_user_id UUID, p_activity VARCHAR)
RETURNS BOOLEAN AS $
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  user_stats RECORD;
  current_activities JSONB;
BEGIN
  -- Get or create today's activity record
  SELECT activities INTO current_activities
  FROM public.daily_activities
  WHERE user_id = p_user_id AND activity_date = today_date;

  -- If no record exists, create it
  IF current_activities IS NULL THEN
    current_activities := '[]'::jsonb;
  END IF;

  -- Add activity if not already present
  IF NOT current_activities ? p_activity THEN
    current_activities := current_activities || jsonb_build_array(p_activity);
    
    -- Insert or update daily activity
    INSERT INTO public.daily_activities (user_id, activity_date, activities, points_earned)
    VALUES (p_user_id, today_date, current_activities, 10)
    ON CONFLICT (user_id, activity_date) DO UPDATE SET
      activities = current_activities,
      points_earned = daily_activities.points_earned + 10;

    -- Update streak
    SELECT * INTO user_stats FROM public.user_gamification_stats WHERE user_id = p_user_id;
    
    IF user_stats.last_activity_date = yesterday_date THEN
      -- Continue streak
      UPDATE public.user_gamification_stats 
      SET 
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = today_date,
        total_points = total_points + 10,
        updated_at = NOW()
      WHERE user_id = p_user_id;
    ELSIF user_stats.last_activity_date != today_date THEN
      -- Start new streak or reset
      UPDATE public.user_gamification_stats 
      SET 
        current_streak = 1,
        longest_streak = GREATEST(longest_streak, 1),
        last_activity_date = today_date,
        total_points = total_points + 10,
        updated_at = NOW()
      WHERE user_id = p_user_id;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retroactively award achievements to all existing users
CREATE OR REPLACE FUNCTION retroactively_award_achievements()
RETURNS TABLE(user_id UUID, achievements_awarded INTEGER, points_awarded INTEGER) AS $
DECLARE
  user_record RECORD;
  achievement_record RECORD;
  sensor_count INTEGER;
  success_count INTEGER;
  success_rate NUMERIC;
  total_achievements INTEGER;
  points_earned INTEGER;
  note_count INTEGER;
  tag_count INTEGER;
  calculated_level INTEGER;
  min_sensors INTEGER;
BEGIN
  -- Loop through all users who have sensors
  FOR user_record IN 
    SELECT DISTINCT s.user_id 
    FROM public.sensors s 
    WHERE s.is_deleted = false
  LOOP
    total_achievements := 0;
    points_earned := 0;
    
    -- Get user's sensor statistics
    SELECT 
      COUNT(*) as total_sensors,
      COUNT(*) FILTER (WHERE s.is_problematic = false) as successful_sensors
    INTO sensor_count, success_count
    FROM public.sensors s
    WHERE s.user_id = user_record.user_id 
    AND s.is_deleted = false 
    AND s.archived_at IS NULL;
    
    -- Calculate success rate
    IF sensor_count > 0 THEN
      success_rate := (success_count::NUMERIC / sensor_count::NUMERIC) * 100;
    ELSE
      success_rate := 0;
    END IF;
    
    -- Create or update user gamification stats
    INSERT INTO public.user_gamification_stats (
      user_id, 
      sensors_tracked, 
      successful_sensors,
      total_points,
      level
    ) VALUES (
      user_record.user_id,
      sensor_count,
      success_count,
      0, -- Will be updated as we award achievements
      1
    ) ON CONFLICT (user_id) DO UPDATE SET
      sensors_tracked = sensor_count,
      successful_sensors = success_count,
      updated_at = NOW();
    
    -- Award sensor count achievements
    FOR achievement_record IN 
      SELECT * FROM public.achievements 
      WHERE requirement_type = 'sensor_count' 
      AND is_active = true
      AND requirement_value <= sensor_count
      ORDER BY requirement_value ASC
    LOOP
      -- Check if user already has this achievement
      IF NOT EXISTS (
        SELECT 1 FROM public.user_achievements 
        WHERE user_id = user_record.user_id AND achievement_id = achievement_record.id
      ) THEN
        -- Award the achievement
        INSERT INTO public.user_achievements (user_id, achievement_id, progress_data)
        VALUES (user_record.user_id, achievement_record.id, jsonb_build_object(
          'sensors_tracked', sensor_count,
          'awarded_for', 'sensor_count',
          'retroactive', true
        ));
        
        total_achievements := total_achievements + 1;
        points_earned := points_earned + achievement_record.points;
      END IF;
    END LOOP;
    
    -- Award success rate achievements (only if user has enough sensors)
    IF sensor_count >= 10 THEN
      FOR achievement_record IN 
        SELECT * FROM public.achievements 
        WHERE requirement_type = 'success_rate' 
        AND is_active = true
        AND requirement_value <= success_rate
        ORDER BY requirement_value ASC
      LOOP
        -- Check minimum sensor requirement from achievement data
        min_sensors := COALESCE((achievement_record.requirement_data->>'min_sensors')::INTEGER, 10);
          
        IF sensor_count >= min_sensors AND NOT EXISTS (
          SELECT 1 FROM public.user_achievements 
          WHERE user_id = user_record.user_id AND achievement_id = achievement_record.id
        ) THEN
          -- Award the achievement
          INSERT INTO public.user_achievements (user_id, achievement_id, progress_data)
          VALUES (user_record.user_id, achievement_record.id, jsonb_build_object(
            'success_rate', success_rate,
            'sensors_tracked', sensor_count,
            'awarded_for', 'success_rate',
            'retroactive', true
          ));
          
          total_achievements := total_achievements + 1;
          points_earned := points_earned + achievement_record.points;
        END IF;
      END LOOP;
    END IF;
    
    -- Calculate level based on points (Level = floor(log2(points/50)) + 1, minimum 1)
    IF points_earned < 100 THEN
      calculated_level := 1;
    ELSE
      calculated_level := FLOOR(LOG(2, points_earned::NUMERIC / 50)) + 1;
    END IF;
    
    -- Update user stats with total points and achievements
    UPDATE public.user_gamification_stats 
    SET 
      total_points = points_earned,
      achievements_earned = total_achievements,
      level = calculated_level,
      updated_at = NOW()
    WHERE user_id = user_record.user_id;
    
    -- Return results for this user
    RETURN QUERY SELECT user_record.user_id, total_achievements, points_earned;
    
  END LOOP;
  
  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update stats when sensors are inserted
CREATE TRIGGER trigger_update_gamification_stats
  AFTER INSERT ON public.sensors
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_stats();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user_id ON public.admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON public.admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON public.admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON public.system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON public.system_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON public.admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Only admins can view admin users" ON public.admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "Only super admins can manage admin users" ON public.admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
    )
  );

CREATE POLICY "Only admins can view activity logs" ON public.admin_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can insert activity logs" ON public.admin_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can view system metrics" ON public.system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can insert system metrics" ON public.system_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can view admin notifications" ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage admin notifications" ON public.admin_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ADMIN POLICIES FOR EXISTING TABLES
-- ============================================================================

-- Admin policies for sensor_models
CREATE POLICY "Admins can manage sensor models" ON public.sensor_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Admin policies for achievements
CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Admin policies for notification templates
CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Admin policies for notifications (admins can manage all notifications)
CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );