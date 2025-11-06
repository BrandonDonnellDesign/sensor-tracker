-- Real-time Notification Triggers Migration
-- Creates database triggers to automatically generate notifications when data changes

-- Function to check and create IOB safety notifications
CREATE OR REPLACE FUNCTION check_iob_safety_notifications()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  current_iob NUMERIC := 0;
  recent_doses_count INTEGER := 0;
  current_glucose NUMERIC;
  notification_exists BOOLEAN := FALSE;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE id = NEW.user_id;
  
  -- Skip if notifications disabled
  IF NOT COALESCE(user_profile.notifications_enabled, false) THEN
    RETURN NEW;
  END IF;
  
  -- Skip if IOB alerts disabled
  IF NOT COALESCE((user_profile.notification_preferences->>'iob_stacking_alerts')::boolean, true) THEN
    RETURN NEW;
  END IF;
  
  -- Calculate current IOB for user
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - taken_at))/3600 < 4 THEN
          units * GREATEST(0, (4 - EXTRACT(EPOCH FROM (NOW() - taken_at))/3600) / 4)
        ELSE 0
      END
    ), 0),
    COUNT(CASE WHEN taken_at > NOW() - INTERVAL '2 hours' THEN 1 END)
  INTO current_iob, recent_doses_count
  FROM insulin_logs 
  WHERE user_id = NEW.user_id 
    AND taken_at > NOW() - INTERVAL '4 hours';
  
  -- Get current glucose if available
  SELECT value INTO current_glucose
  FROM glucose_readings 
  WHERE user_id = NEW.user_id 
  ORDER BY system_time DESC 
  LIMIT 1;
  
  -- Check for insulin stacking (multiple doses + high IOB)
  IF recent_doses_count >= 2 AND current_iob > 3 THEN
    -- Check if we already have this notification recently
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE user_id = NEW.user_id 
        AND type = 'smart_alert'
        AND title LIKE '%Insulin Stacking%'
        AND created_at > NOW() - INTERVAL '2 hours'
        AND dismissed_at IS NULL
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (
        user_id, title, message, type, status, delivery_status, metadata
      ) VALUES (
        NEW.user_id,
        '⚠️ Insulin Stacking Detected',
        format('You have %s recent doses with %.1fu IOB. Risk of hypoglycemia!', recent_doses_count, current_iob),
        'smart_alert',
        'pending',
        'pending',
        jsonb_build_object(
          'priority', 'urgent',
          'alert_type', 'iob_stacking',
          'iob_amount', current_iob,
          'recent_doses', recent_doses_count
        )
      );
    END IF;
  END IF;
  
  -- Check for high IOB + low glucose
  IF current_glucose IS NOT NULL AND current_glucose < 100 AND current_iob > 2 THEN
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE user_id = NEW.user_id 
        AND type = 'smart_alert'
        AND title LIKE '%High IOB + Low Glucose%'
        AND created_at > NOW() - INTERVAL '30 minutes'
        AND dismissed_at IS NULL
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (
        user_id, title, message, type, status, delivery_status, metadata
      ) VALUES (
        NEW.user_id,
        '🚨 High IOB + Low Glucose',
        format('Glucose: %s mg/dL with %.1fu IOB. Consider having carbs!', current_glucose::integer, current_iob),
        'smart_alert',
        'pending',
        'pending',
        jsonb_build_object(
          'priority', 'urgent',
          'alert_type', 'high_iob_low_glucose',
          'glucose', current_glucose,
          'iob_amount', current_iob
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check glucose-based notifications
CREATE OR REPLACE FUNCTION check_glucose_notifications()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  recent_readings RECORD;
  recent_food_count INTEGER := 0;
  notification_exists BOOLEAN := FALSE;
  trend_direction TEXT;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE id = NEW.user_id;
  
  -- Skip if notifications disabled
  IF NOT COALESCE(user_profile.notifications_enabled, false) THEN
    RETURN NEW;
  END IF;
  
  -- Skip if glucose alerts disabled
  IF NOT COALESCE((user_profile.notification_preferences->>'rising_glucose_alerts')::boolean, true) THEN
    RETURN NEW;
  END IF;
  
  -- Get recent readings to determine trend
  SELECT 
    COUNT(*) as reading_count,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value
  INTO recent_readings
  FROM glucose_readings 
  WHERE user_id = NEW.user_id 
    AND system_time > NOW() - INTERVAL '3 hours'
    AND system_time <= NEW.system_time;
  
  -- Simple trend detection (compare current to 1 hour ago)
  SELECT 
    CASE 
      WHEN NEW.value > (
        SELECT value FROM glucose_readings 
        WHERE user_id = NEW.user_id 
          AND system_time <= NEW.system_time - INTERVAL '1 hour'
        ORDER BY system_time DESC LIMIT 1
      ) + 20 THEN 'rising'
      WHEN NEW.value < (
        SELECT value FROM glucose_readings 
        WHERE user_id = NEW.user_id 
          AND system_time <= NEW.system_time - INTERVAL '1 hour'
        ORDER BY system_time DESC LIMIT 1
      ) - 20 THEN 'falling'
      ELSE 'stable'
    END INTO trend_direction;
  
  -- Check for recent food logs
  SELECT COUNT(*) INTO recent_food_count
  FROM food_logs 
  WHERE user_id = NEW.user_id 
    AND logged_at > NOW() - INTERVAL '2 hours';
  
  -- Rising glucose without food alert
  IF trend_direction = 'rising' AND NEW.value > 140 AND recent_food_count = 0 THEN
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE user_id = NEW.user_id 
        AND type = 'smart_alert'
        AND title LIKE '%Rising Glucose%'
        AND created_at > NOW() - INTERVAL '1 hour'
        AND dismissed_at IS NULL
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (
        user_id, title, message, type, status, delivery_status, metadata
      ) VALUES (
        NEW.user_id,
        '📈 Rising Glucose Detected',
        format('Glucose rising to %s mg/dL with no recent food logged. Did you eat something?', NEW.value::integer),
        'smart_alert',
        'pending',
        'pending',
        jsonb_build_object(
          'priority', 'high',
          'alert_type', 'rising_glucose_no_food',
          'glucose', NEW.value,
          'trend', trend_direction
        )
      );
    END IF;
  END IF;
  
  -- Low glucose alert
  IF NEW.value < COALESCE((user_profile.notification_preferences->>'low_glucose_threshold')::numeric, 80) THEN
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE user_id = NEW.user_id 
        AND type = 'smart_alert'
        AND title LIKE '%Low Glucose%'
        AND created_at > NOW() - INTERVAL '15 minutes'
        AND dismissed_at IS NULL
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (
        user_id, title, message, type, status, delivery_status, metadata
      ) VALUES (
        NEW.user_id,
        '🚨 Low Glucose Alert',
        format('Glucose: %s mg/dL. Treat low blood sugar immediately!', NEW.value::integer),
        'smart_alert',
        'pending',
        'pending',
        jsonb_build_object(
          'priority', 'urgent',
          'alert_type', 'low_glucose',
          'glucose', NEW.value
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_iob_safety_check ON insulin_logs;
CREATE TRIGGER trigger_iob_safety_check
  AFTER INSERT OR UPDATE ON insulin_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_iob_safety_notifications();

DROP TRIGGER IF EXISTS trigger_glucose_notifications ON glucose_readings;
CREATE TRIGGER trigger_glucose_notifications
  AFTER INSERT ON glucose_readings
  FOR EACH ROW
  EXECUTE FUNCTION check_glucose_notifications();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
ON notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_dismissed 
ON notifications(user_id, dismissed_at) WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insulin_logs_user_taken_at 
ON insulin_logs(user_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_glucose_readings_user_system_time 
ON glucose_readings(user_id, system_time DESC);

-- Log the trigger creation
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'notifications',
  'Real-time notification triggers created',
  '{"triggers": ["iob_safety_check", "glucose_notifications"], "functions": ["check_iob_safety_notifications", "check_glucose_notifications"]}'::jsonb
);