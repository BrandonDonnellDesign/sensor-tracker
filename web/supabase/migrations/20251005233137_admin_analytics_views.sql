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
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM sensors) as total_sensors,
  (SELECT COUNT(*) FROM sensor_photos) as total_photos,
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  now() as last_updated;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_sensors_created_at ON sensors(created_at);
CREATE INDEX IF NOT EXISTS idx_sensors_user_id ON sensors(user_id);

-- RLS: These views inherit RLS from base tables
-- For admin access, use service role or create admin-specific policies

-- Optional: Materialized views for expensive queries (commented out by default)
-- CREATE MATERIALIZED VIEW IF NOT EXISTS admin_sensor_stats_mv AS
-- SELECT * FROM admin_sensor_stats;
-- 
-- -- Refresh materialized view (run periodically via cron)
-- REFRESH MATERIALIZED VIEW admin_sensor_stats_mv;