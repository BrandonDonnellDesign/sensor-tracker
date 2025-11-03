-- Comprehensive Security Functions Migration
-- Migration: 20251030000012_comprehensive_security_functions.sql
-- Description: Complete security monitoring, threat detection, and audit functions

-- ============================================================================
-- SECURITY ANALYSIS FUNCTIONS
-- ============================================================================

-- Function to analyze user behavior patterns for anomalies
CREATE OR REPLACE FUNCTION analyze_user_security_patterns(
  p_user_id UUID,
  p_hours_back INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  user_pattern JSONB;
  sensor_activity INTEGER;
  login_frequency INTEGER;
  unusual_activity BOOLEAN := FALSE;
  risk_score INTEGER := 0;
  time_threshold TIMESTAMP;
BEGIN
  time_threshold := NOW() - (p_hours_back || ' hours')::INTERVAL;
  
  -- Analyze sensor activity patterns
  SELECT COUNT(*)
  INTO sensor_activity
  FROM sensors
  WHERE user_id = p_user_id
    AND created_at >= time_threshold
    AND is_deleted = FALSE;
  
  -- Check profile update frequency
  SELECT COUNT(*)
  INTO login_frequency
  FROM profiles
  WHERE id = p_user_id
    AND updated_at >= time_threshold;
  
  -- Calculate risk score based on patterns
  IF sensor_activity > 10 THEN
    risk_score := risk_score + 30;
    unusual_activity := TRUE;
  END IF;
  
  IF login_frequency > 20 THEN
    risk_score := risk_score + 20;
    unusual_activity := TRUE;
  END IF;
  
  -- Build analysis result
  user_pattern := jsonb_build_object(
    'user_id', p_user_id,
    'analysis_period_hours', p_hours_back,
    'sensor_activity_count', sensor_activity,
    'login_frequency', login_frequency,
    'risk_score', risk_score,
    'unusual_activity_detected', unusual_activity,
    'risk_level', CASE
      WHEN risk_score >= 50 THEN 'high'
      WHEN risk_score >= 25 THEN 'medium'
      ELSE 'low'
    END,
    'analyzed_at', NOW()
  );
  
  -- Log high-risk patterns
  IF risk_score >= 50 THEN
    PERFORM log_security_event(
      'warn',
      'security',
      'High-risk user behavior pattern detected',
      CONCAT('user_', SUBSTRING(p_user_id::text, 1, 8)),
      user_pattern
    );
  END IF;
  
  RETURN user_pattern;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect and analyze failed authentication attempts
CREATE OR REPLACE FUNCTION analyze_failed_auth_attempts(
  p_hours_back INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  failed_attempts JSONB;
  suspicious_ips JSONB;
  total_failures INTEGER;
  unique_ips INTEGER;
BEGIN
  -- Get failed authentication data from system logs
  WITH failed_auth AS (
    SELECT 
      metadata->>'ip_address' as ip_address,
      metadata->>'user_email' as user_email,
      COUNT(*) as attempt_count,
      MAX(created_at) as last_attempt
    FROM system_logs
    WHERE category = 'auth'
      AND level IN ('warn', 'error')
      AND message ILIKE '%failed%'
      AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    GROUP BY metadata->>'ip_address', metadata->>'user_email'
  ),
  suspicious_activity AS (
    SELECT 
      ip_address,
      COUNT(DISTINCT user_email) as targeted_users,
      SUM(attempt_count) as total_attempts,
      MAX(last_attempt) as most_recent
    FROM failed_auth
    WHERE attempt_count >= 3
    GROUP BY ip_address
  )
  SELECT 
    COUNT(*) as total_failed_attempts,
    COUNT(DISTINCT ip_address) as unique_ip_count,
    jsonb_agg(
      jsonb_build_object(
        'ip_address', ip_address,
        'targeted_users', targeted_users,
        'total_attempts', total_attempts,
        'most_recent', most_recent
      )
    ) FILTER (WHERE total_attempts >= 5) as suspicious_ips
  INTO total_failures, unique_ips, suspicious_ips
  FROM suspicious_activity;
  
  failed_attempts := jsonb_build_object(
    'analysis_period_hours', p_hours_back,
    'total_failed_attempts', COALESCE(total_failures, 0),
    'unique_ips_involved', COALESCE(unique_ips, 0),
    'suspicious_ips', COALESCE(suspicious_ips, '[]'::jsonb),
    'threat_level', CASE
      WHEN total_failures >= 50 THEN 'critical'
      WHEN total_failures >= 20 THEN 'high'
      WHEN total_failures >= 5 THEN 'medium'
      ELSE 'low'
    END,
    'analyzed_at', NOW()
  );
  
  -- Log critical threats
  IF total_failures >= 50 THEN
    PERFORM log_security_event(
      'error',
      'security',
      'Critical authentication threat detected',
      'system',
      failed_attempts
    );
  END IF;
  
  RETURN failed_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to monitor data access patterns
CREATE OR REPLACE FUNCTION monitor_data_access_patterns(
  p_hours_back INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  access_patterns JSONB;
  bulk_access_users JSONB;
  admin_activities JSONB;
BEGIN
  -- Analyze bulk data access (users accessing lots of sensors)
  WITH user_access AS (
    SELECT 
      user_id,
      COUNT(*) as sensors_accessed,
      COUNT(DISTINCT DATE_TRUNC('hour', updated_at)) as active_hours
    FROM sensors
    WHERE updated_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
      AND is_deleted = FALSE
    GROUP BY user_id
    HAVING COUNT(*) > 20 -- More than 20 sensor interactions
  ),
  admin_actions AS (
    SELECT 
      user_hash,
      COUNT(*) as admin_actions,
      array_agg(DISTINCT message) as action_types
    FROM system_logs
    WHERE category = 'admin'
      AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    GROUP BY user_hash
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'sensors_accessed', sensors_accessed,
        'active_hours', active_hours,
        'access_rate', ROUND(sensors_accessed::numeric / active_hours, 2)
      )
    ) as bulk_users,
    (SELECT jsonb_agg(
      jsonb_build_object(
        'user_hash', user_hash,
        'admin_actions', admin_actions,
        'action_types', action_types
      )
    ) FROM admin_actions) as admin_activities
  INTO bulk_access_users, admin_activities
  FROM user_access;
  
  access_patterns := jsonb_build_object(
    'analysis_period_hours', p_hours_back,
    'bulk_access_users', COALESCE(bulk_access_users, '[]'::jsonb),
    'admin_activities', COALESCE(admin_activities, '[]'::jsonb),
    'analyzed_at', NOW()
  );
  
  RETURN access_patterns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURITY POLICY ENFORCEMENT FUNCTIONS
-- ============================================================================

-- Function to enforce rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
  window_start TIMESTAMP;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count recent actions of this type by user
  SELECT COUNT(*)
  INTO action_count
  FROM system_logs
  WHERE user_hash = CONCAT('user_', SUBSTRING(p_user_id::text, 1, 8))
    AND metadata->>'action' = p_action
    AND created_at >= window_start;
  
  -- Log rate limit violations
  IF action_count >= p_limit THEN
    PERFORM log_security_event(
      'warn',
      'security',
      'Rate limit exceeded for action: ' || p_action,
      CONCAT('user_', SUBSTRING(p_user_id::text, 1, 8)),
      jsonb_build_object(
        'action', p_action,
        'limit', p_limit,
        'window_minutes', p_window_minutes,
        'actual_count', action_count
      )
    );
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and sanitize user input
CREATE OR REPLACE FUNCTION validate_user_input(
  p_input TEXT,
  p_field_name TEXT,
  p_max_length INTEGER DEFAULT 255
) RETURNS BOOLEAN AS $$
DECLARE
  suspicious_patterns TEXT[] := ARRAY[
    '<script', 'javascript:', 'vbscript:', 'onload=', 'onerror=',
    'eval(', 'exec(', 'system(', 'cmd.exe', '/bin/sh',
    'union select', 'drop table', 'delete from', 'insert into'
  ];
  pattern TEXT;
BEGIN
  -- Check length
  IF LENGTH(p_input) > p_max_length THEN
    PERFORM log_security_event(
      'warn',
      'security',
      'Input length violation in field: ' || p_field_name,
      CONCAT('user_', SUBSTRING(auth.uid()::text, 1, 8)),
      jsonb_build_object(
        'field', p_field_name,
        'max_length', p_max_length,
        'actual_length', LENGTH(p_input)
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Check for suspicious patterns
  FOREACH pattern IN ARRAY suspicious_patterns
  LOOP
    IF LOWER(p_input) LIKE '%' || pattern || '%' THEN
      PERFORM log_security_event(
        'error',
        'security',
        'Suspicious input pattern detected in field: ' || p_field_name,
        CONCAT('user_', SUBSTRING(auth.uid()::text, 1, 8)),
        jsonb_build_object(
          'field', p_field_name,
          'pattern_detected', pattern,
          'input_sample', LEFT(p_input, 100)
        )
      );
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURITY REPORTING FUNCTIONS
-- ============================================================================

-- Function to generate comprehensive security report
CREATE OR REPLACE FUNCTION generate_security_report(
  p_hours_back INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  security_report JSONB;
  auth_analysis JSONB;
  access_analysis JSONB;
  threat_summary JSONB;
  recommendations TEXT[];
BEGIN
  -- Get authentication analysis
  auth_analysis := analyze_failed_auth_attempts(p_hours_back);
  
  -- Get data access analysis
  access_analysis := monitor_data_access_patterns(p_hours_back);
  
  -- Build threat summary
  WITH threat_counts AS (
    SELECT 
      level,
      COUNT(*) as count
    FROM system_logs
    WHERE category = 'security'
      AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    GROUP BY level
  )
  SELECT jsonb_object_agg(level, count)
  INTO threat_summary
  FROM threat_counts;
  
  -- Generate recommendations based on findings
  recommendations := ARRAY[]::TEXT[];
  
  IF (auth_analysis->>'total_failed_attempts')::INTEGER > 10 THEN
    recommendations := array_append(recommendations, 'Consider implementing IP-based rate limiting');
  END IF;
  
  IF jsonb_array_length(COALESCE(access_analysis->'bulk_access_users', '[]'::jsonb)) > 0 THEN
    recommendations := array_append(recommendations, 'Review bulk data access patterns for potential abuse');
  END IF;
  
  IF COALESCE((threat_summary->>'error')::INTEGER, 0) > 5 THEN
    recommendations := array_append(recommendations, 'Investigate high-severity security events');
  END IF;
  
  -- Compile final report
  security_report := jsonb_build_object(
    'report_generated_at', NOW(),
    'analysis_period_hours', p_hours_back,
    'authentication_analysis', auth_analysis,
    'data_access_analysis', access_analysis,
    'threat_summary', COALESCE(threat_summary, '{}'::jsonb),
    'security_recommendations', recommendations,
    'overall_security_status', CASE
      WHEN (auth_analysis->>'threat_level') = 'critical' THEN 'critical'
      WHEN (auth_analysis->>'threat_level') IN ('high', 'medium') THEN 'elevated'
      ELSE 'normal'
    END
  );
  
  -- Log report generation
  PERFORM log_security_event(
    'info',
    'security',
    'Security report generated',
    'system',
    jsonb_build_object('report_period_hours', p_hours_back)
  );
  
  RETURN security_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get security metrics for dashboard
CREATE OR REPLACE FUNCTION get_security_metrics(
  p_hours_back INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  metrics JSONB;
  failed_logins INTEGER;
  suspicious_activities INTEGER;
  admin_actions INTEGER;
  unique_ips INTEGER;
  high_risk_users INTEGER;
BEGIN
  -- Count failed login attempts
  SELECT COUNT(*)
  INTO failed_logins
  FROM system_logs
  WHERE category = 'auth'
    AND level IN ('warn', 'error')
    AND message ILIKE '%failed%'
    AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL;
  
  -- Count suspicious activities
  SELECT COUNT(*)
  INTO suspicious_activities
  FROM system_logs
  WHERE category = 'security'
    AND level IN ('warn', 'error')
    AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL;
  
  -- Count admin actions
  SELECT COUNT(*)
  INTO admin_actions
  FROM system_logs
  WHERE category = 'admin'
    AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL;
  
  -- Count unique IPs from recent activity
  SELECT COUNT(DISTINCT metadata->>'ip_address')
  INTO unique_ips
  FROM system_logs
  WHERE metadata ? 'ip_address'
    AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL;
  
  -- Count high-risk users (users with excessive activity)
  SELECT COUNT(DISTINCT user_id)
  INTO high_risk_users
  FROM sensors
  WHERE created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND is_deleted = FALSE
  GROUP BY user_id
  HAVING COUNT(*) > 10;
  
  metrics := jsonb_build_object(
    'failed_logins_24h', COALESCE(failed_logins, 0),
    'suspicious_activity_24h', COALESCE(suspicious_activities, 0),
    'admin_actions_24h', COALESCE(admin_actions, 0),
    'unique_ips_24h', COALESCE(unique_ips, 0),
    'high_risk_users', COALESCE(high_risk_users, 0),
    'last_security_scan', NOW(),
    'security_status', CASE
      WHEN suspicious_activities > 10 OR failed_logins > 50 THEN 'critical'
      WHEN suspicious_activities > 5 OR failed_logins > 20 THEN 'elevated'
      ELSE 'normal'
    END
  );
  
  RETURN metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTOMATED SECURITY TRIGGERS
-- ============================================================================

-- Function to automatically respond to security threats
CREATE OR REPLACE FUNCTION auto_security_response()
RETURNS TRIGGER AS $$
DECLARE
  threat_level TEXT;
  user_id_hash TEXT;
BEGIN
  -- Only process security-related logs
  IF NEW.category != 'security' OR NEW.level NOT IN ('warn', 'error') THEN
    RETURN NEW;
  END IF;
  
  threat_level := NEW.level;
  user_id_hash := NEW.user_hash;
  
  -- Auto-escalate critical threats
  IF threat_level = 'error' AND NEW.message ILIKE '%critical%' THEN
    -- Log escalation
    INSERT INTO system_logs (level, category, message, user_hash, metadata)
    VALUES (
      'error',
      'security',
      'AUTOMATED ESCALATION: Critical security threat detected',
      'system',
      jsonb_build_object(
        'original_event_id', NEW.id,
        'escalated_at', NOW(),
        'auto_response', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automated security responses
DROP TRIGGER IF EXISTS trigger_auto_security_response ON system_logs;
CREATE TRIGGER trigger_auto_security_response
  AFTER INSERT ON system_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_security_response();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_user_security_patterns(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION analyze_failed_auth_attempts(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION monitor_data_access_patterns(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_input(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_security_report(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_security_metrics(INTEGER) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION analyze_user_security_patterns IS 'Analyzes user behavior patterns to detect anomalies and calculate risk scores';
COMMENT ON FUNCTION analyze_failed_auth_attempts IS 'Analyzes failed authentication attempts to identify potential threats';
COMMENT ON FUNCTION monitor_data_access_patterns IS 'Monitors data access patterns to detect bulk access and suspicious behavior';
COMMENT ON FUNCTION check_rate_limit IS 'Enforces rate limiting for user actions to prevent abuse';
COMMENT ON FUNCTION validate_user_input IS 'Validates and sanitizes user input to prevent injection attacks';
COMMENT ON FUNCTION generate_security_report IS 'Generates comprehensive security reports with analysis and recommendations';
COMMENT ON FUNCTION get_security_metrics IS 'Returns security metrics for dashboard display';
COMMENT ON FUNCTION auto_security_response IS 'Automated trigger function for responding to security threats';