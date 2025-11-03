-- Migration: Add security logging functions and triggers
-- Created: 2025-10-30
-- Description: Adds utility functions for security logging and automatic audit triggers

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_level TEXT,
  p_category TEXT,
  p_message TEXT,
  p_user_hash TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO system_logs (level, category, message, user_hash, metadata)
  VALUES (p_level, p_category, p_message, p_user_hash, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log profile updates (excluding routine updates like last_sign_in_at)
  IF TG_OP = 'UPDATE' AND (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.full_name IS DISTINCT FROM NEW.full_name
  ) THEN
    PERFORM log_security_event(
      'info',
      'security',
      'Profile updated: ' || COALESCE(NEW.email, 'unknown'),
      CONCAT('user_', SUBSTRING(NEW.id::text, 1, 8)),
      jsonb_build_object(
        'action', 'profile_update',
        'changed_fields', jsonb_build_object(
          'email_changed', OLD.email IS DISTINCT FROM NEW.email,
          'role_changed', OLD.role IS DISTINCT FROM NEW.role,
          'name_changed', OLD.full_name IS DISTINCT FROM NEW.full_name
        )
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log bulk sensor operations (potential abuse)
CREATE OR REPLACE FUNCTION log_bulk_sensor_operations()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Check for bulk sensor creation (more than 5 in last hour)
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*)
    INTO recent_count
    FROM sensors
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF recent_count > 5 THEN
      PERFORM log_security_event(
        'warn',
        'security',
        'Bulk sensor creation detected',
        CONCAT('user_', SUBSTRING(NEW.user_id::text, 1, 8)),
        jsonb_build_object(
          'action', 'bulk_sensor_creation',
          'sensor_count', recent_count,
          'time_window', '1 hour'
        )
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic security logging
DROP TRIGGER IF EXISTS trigger_log_profile_changes ON profiles;
CREATE TRIGGER trigger_log_profile_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_changes();

DROP TRIGGER IF EXISTS trigger_log_bulk_sensors ON sensors;
CREATE TRIGGER trigger_log_bulk_sensors
  AFTER INSERT ON sensors
  FOR EACH ROW
  EXECUTE FUNCTION log_bulk_sensor_operations();

-- Grant execute permissions on the security logging function
GRANT EXECUTE ON FUNCTION log_security_event TO service_role;
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;

-- Add comments
COMMENT ON FUNCTION log_security_event IS 'Utility function to log security events to system_logs table';
COMMENT ON FUNCTION log_profile_changes IS 'Trigger function to automatically log profile changes';
COMMENT ON FUNCTION log_bulk_sensor_operations IS 'Trigger function to detect and log bulk sensor operations';