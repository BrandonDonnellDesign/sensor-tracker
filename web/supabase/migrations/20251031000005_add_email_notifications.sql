-- Email Notifications System Migration
-- Adds notification preferences and logging for email system

-- Add email field to profiles table for notification system
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add notification preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "emailNotifications": true,
  "commentReplies": true,
  "weeklyDigest": true,
  "adminAlerts": false
}'::jsonb;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table with email from auth.users
  UPDATE profiles 
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email changes from auth.users to profiles
DROP TRIGGER IF EXISTS trigger_sync_user_email ON auth.users;
CREATE TRIGGER trigger_sync_user_email
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Sync existing emails from auth.users to profiles
UPDATE profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE profiles.id = auth_users.id
  AND profiles.email IS NULL;

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'comment_reply', 'admin_alert', 'welcome', 'weekly_digest'
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_success ON notification_logs(success);

-- Create email queue table for batch processing
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal', -- 'high', 'normal', 'low'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);
CREATE INDEX IF NOT EXISTS idx_email_queue_template_type ON email_queue(template_type);

-- Create weekly digest tracking table
CREATE TABLE IF NOT EXISTS weekly_digest_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  email_id UUID REFERENCES email_queue(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Create index for weekly digest tracking
CREATE INDEX IF NOT EXISTS idx_weekly_digest_tracking_user_week ON weekly_digest_tracking(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_digest_tracking_sent_at ON weekly_digest_tracking(sent_at);

-- Enable RLS on new tables
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digest_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for email_queue (admin only)
CREATE POLICY "Admins can manage email queue"
  ON email_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can manage email queue"
  ON email_queue FOR ALL
  WITH CHECK (true);

-- RLS Policies for weekly_digest_tracking
CREATE POLICY "Users can view their own digest tracking"
  ON weekly_digest_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all digest tracking"
  ON weekly_digest_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can manage digest tracking"
  ON weekly_digest_tracking FOR ALL
  WITH CHECK (true);

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  user_id UUID,
  preferences JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET notification_preferences = preferences,
      updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue an email
CREATE OR REPLACE FUNCTION queue_email(
  p_recipient_email VARCHAR(255),
  p_recipient_name VARCHAR(255),
  p_subject VARCHAR(500),
  p_html_content TEXT,
  p_text_content TEXT,
  p_template_type VARCHAR(50),
  p_priority VARCHAR(10) DEFAULT 'normal',
  p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  email_id UUID;
BEGIN
  INSERT INTO email_queue (
    recipient_email,
    recipient_name,
    subject,
    html_content,
    text_content,
    template_type,
    priority,
    scheduled_for,
    metadata
  ) VALUES (
    p_recipient_email,
    p_recipient_name,
    p_subject,
    p_html_content,
    p_text_content,
    p_template_type,
    p_priority,
    p_scheduled_for,
    p_metadata
  ) RETURNING id INTO email_id;
  
  RETURN email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending emails for processing
CREATE OR REPLACE FUNCTION get_pending_emails(
  batch_size INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  subject VARCHAR(500),
  html_content TEXT,
  text_content TEXT,
  template_type VARCHAR(50),
  priority VARCHAR(10),
  attempts INTEGER,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.recipient_email,
    e.recipient_name,
    e.subject,
    e.html_content,
    e.text_content,
    e.template_type,
    e.priority,
    e.attempts,
    e.metadata
  FROM email_queue e
  WHERE e.status = 'pending'
    AND e.scheduled_for <= NOW()
    AND e.attempts < e.max_attempts
  ORDER BY 
    CASE e.priority 
      WHEN 'high' THEN 1
      WHEN 'normal' THEN 2
      WHEN 'low' THEN 3
    END,
    e.scheduled_for ASC
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION mark_email_sent(
  email_id UUID,
  success BOOLEAN,
  error_msg TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  IF success THEN
    UPDATE email_queue 
    SET status = 'sent',
        sent_at = NOW(),
        updated_at = NOW()
    WHERE id = email_id;
  ELSE
    UPDATE email_queue 
    SET attempts = attempts + 1,
        error_message = error_msg,
        status = CASE 
          WHEN attempts + 1 >= max_attempts THEN 'failed'
          ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = email_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_sent INTEGER,
  success_rate DECIMAL,
  by_type JSONB,
  daily_stats JSONB
) AS $$
DECLARE
  stats_result RECORD;
BEGIN
  -- Get overall stats
  SELECT 
    COUNT(*)::INTEGER as total,
    ROUND(
      (COUNT(*) FILTER (WHERE success = true)::DECIMAL / 
       NULLIF(COUNT(*), 0)) * 100, 2
    ) as success_pct
  INTO stats_result
  FROM notification_logs 
  WHERE sent_at::DATE BETWEEN start_date AND end_date;
  
  total_sent := stats_result.total;
  success_rate := stats_result.success_pct;
  
  -- Get stats by type
  SELECT jsonb_object_agg(
    type, 
    jsonb_build_object(
      'count', count,
      'success_rate', success_rate
    )
  ) INTO by_type
  FROM (
    SELECT 
      type,
      COUNT(*)::INTEGER as count,
      ROUND(
        (COUNT(*) FILTER (WHERE success = true)::DECIMAL / 
         NULLIF(COUNT(*), 0)) * 100, 2
      ) as success_rate
    FROM notification_logs 
    WHERE sent_at::DATE BETWEEN start_date AND end_date
    GROUP BY type
  ) type_stats;
  
  -- Get daily stats
  SELECT jsonb_object_agg(
    date_sent::TEXT,
    jsonb_build_object(
      'sent', sent_count,
      'success', success_count
    )
  ) INTO daily_stats
  FROM (
    SELECT 
      sent_at::DATE as date_sent,
      COUNT(*)::INTEGER as sent_count,
      COUNT(*) FILTER (WHERE success = true)::INTEGER as success_count
    FROM notification_logs 
    WHERE sent_at::DATE BETWEEN start_date AND end_date
    GROUP BY sent_at::DATE
    ORDER BY sent_at::DATE
  ) daily_data;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION queue_email TO service_role;
GRANT EXECUTE ON FUNCTION get_pending_emails TO service_role;
GRANT EXECUTE ON FUNCTION mark_email_sent TO service_role;
GRANT EXECUTE ON FUNCTION get_notification_stats TO authenticated;

-- Update admin users to have admin alerts enabled by default
UPDATE profiles 
SET notification_preferences = notification_preferences || '{"adminAlerts": true}'::jsonb
WHERE role = 'admin';

-- Add comment to track migration
COMMENT ON TABLE notification_logs IS 'Tracks all email notifications sent by the system';
COMMENT ON TABLE email_queue IS 'Queue for batch processing of emails';
COMMENT ON TABLE weekly_digest_tracking IS 'Tracks weekly digest emails to prevent duplicates';