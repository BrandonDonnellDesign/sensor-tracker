-- Consolidated Admin System Migration
-- Combines admin tables and analytics views
-- Migration: 20251007000002_consolidated_admin_system.sql

-- Admin System Tables Migration
-- Creates tables for admin functionality: system logs, feature flags, admin notes

-- 1. System logs table for audit trail and debugging
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  category text NOT NULL, -- 'auth', 'sensors', 'ocr', 'dexcom', 'notifications'
  message text NOT NULL,
  user_hash text, -- SHA256 hash of user ID for privacy
  metadata jsonb -- Additional structured data
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);

-- RLS for system logs (admin only)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 2. Feature flags table for remote config
CREATE TABLE IF NOT EXISTS feature_flags (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for feature flags (read-only for users, admin-only writes)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Public read policy for feature flags
CREATE POLICY "feature_flags_read_all" ON feature_flags
  FOR SELECT USING (true);

-- Insert some default feature flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
  ('glucose_charts', 'Glucose Charts', 'Display glucose trend charts in dashboard', true, 100),
  ('smart_archive', 'Smart Archive', 'Auto-archive old sensors based on ML predictions', false, 0),
  ('dexcom_integration', 'Dexcom Integration', 'Connect with Dexcom API for automatic data sync', true, 25),
  ('advanced_ocr', 'Advanced OCR', 'Use enhanced OCR engine for better accuracy', false, 10)
ON CONFLICT (key) DO NOTHING;

-- Admin Analytics Views Migration
-- Creates privacy-preserving views for admin dashboard analytics
-- These views expose ONLY aggregate/anonymized data

-- 1. Daily active users (last 30 days) based on profile updates
CREATE OR REPLACE VIEW admin_active_users_30d
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', updated_at)::date AS day,
  COUNT(DISTINCT id) AS active_users
FROM profiles
WHERE updated_at >= now() - interval '30 days'
GROUP BY day
ORDER BY day DESC;

-- 2. Sensor statistics aggregates
CREATE OR REPLACE VIEW admin_sensor_stats
WITH (security_invoker = true) AS
SELECT
  COUNT(*) AS total_sensors,
  COUNT(DISTINCT user_id) AS distinct_users_with_sensors,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS sensors_last_24h,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS sensors_last_7d,
  AVG(EXTRACT(DAY FROM (now() - created_at))) AS avg_sensor_age_days
FROM sensors;

-- 3. User engagement metrics
CREATE OR REPLACE VIEW admin_user_engagement
WITH (security_invoker = true) AS
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE updated_at >= now() - interval '24 hours') AS active_last_24h,
  COUNT(*) FILTER (WHERE updated_at >= now() - interval '7 days') AS active_last_7d,
  COUNT(*) FILTER (WHERE updated_at >= now() - interval '30 days') AS active_last_30d,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_last_30d
FROM profiles;

-- 4. Storage and cleanup metrics
CREATE OR REPLACE VIEW admin_cleanup_stats
WITH (security_invoker = true) AS
SELECT
  COUNT(*) FILTER (WHERE created_at < now() - interval '14 days') AS expired_sensors,
  (SELECT COUNT(*) FROM sensor_photos WHERE sensor_id IS NULL) AS orphaned_photos,
  COUNT(*) FILTER (WHERE updated_at < now() - interval '90 days') AS inactive_users_90d
FROM sensors;

-- 5. System health overview
CREATE OR REPLACE VIEW admin_system_health
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM system_logs WHERE level = 'error' AND created_at >= now() - interval '24 hours') AS errors_last_24h,
  (SELECT COUNT(*) FROM system_logs WHERE level = 'warn' AND created_at >= now() - interval '24 hours') AS warnings_last_24h,
  (SELECT COUNT(*) FROM dexcom_sync_log WHERE status = 'error' AND created_at >= now() - interval '24 hours') AS dexcom_errors_last_24h,
  (SELECT AVG(sync_duration_ms) FROM dexcom_sync_log WHERE created_at >= now() - interval '24 hours' AND sync_duration_ms IS NOT NULL) AS avg_sync_duration_ms
FROM (SELECT 1) AS dummy;
