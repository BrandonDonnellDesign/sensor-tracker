-- Database Optimization Migration
-- Adds performance improvements, better indexing, and query optimization
-- Migration: 20251030000010_database_optimization.sql

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "profiles_role_updated_at_idx" 
ON "public"."profiles" ("role", "updated_at" DESC) 
WHERE "role" = 'admin';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "profiles_created_updated_idx" 
ON "public"."profiles" ("created_at", "updated_at");

-- Sensors performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sensors_user_active_idx" 
ON "public"."sensors" ("user_id", "is_deleted", "archived_at") 
WHERE "is_deleted" = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "sensors_problematic_idx" 
ON "public"."sensors" ("is_problematic", "created_at" DESC) 
WHERE "is_problematic" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "sensors_recent_activity_idx" 
ON "public"."sensors" ("updated_at" DESC, "user_id") 
WHERE "is_deleted" = false;

-- System logs indexes for monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS "system_logs_level_created_idx" 
ON "public"."system_logs" ("level", "created_at" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "system_logs_category_created_idx" 
ON "public"."system_logs" ("category", "created_at" DESC);

-- Web vitals indexes for performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS "web_vitals_metric_timestamp_idx" 
ON "public"."web_vitals" ("metric_name", "timestamp" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "web_vitals_rating_timestamp_idx" 
ON "public"."web_vitals" ("metric_rating", "timestamp" DESC);

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- User activity summary (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS "public"."user_activity_summary" AS
SELECT 
    DATE_TRUNC('day', updated_at) as activity_date,
    COUNT(DISTINCT id) as active_users,
    COUNT(DISTINCT CASE WHEN created_at >= updated_at - INTERVAL '1 day' THEN id END) as new_users,
    COUNT(DISTINCT CASE WHEN role = 'admin' THEN id END) as admin_users
FROM public.profiles 
WHERE updated_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', updated_at)
ORDER BY activity_date DESC;

CREATE UNIQUE INDEX ON "public"."user_activity_summary" (activity_date);

-- Sensor usage summary (refreshed daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS "public"."sensor_usage_summary" AS
SELECT 
    DATE_TRUNC('day', created_at) as usage_date,
    COUNT(*) as sensors_added,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(CASE WHEN is_problematic THEN 1 END) as problematic_sensors,
    COUNT(CASE WHEN archived_at IS NOT NULL THEN 1 END) as archived_sensors,
    AVG(CASE 
        WHEN archived_at IS NOT NULL AND date_added IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (archived_at - date_added)) / 86400 
    END) as avg_wear_days
FROM public.sensors 
WHERE created_at >= NOW() - INTERVAL '90 days'
AND is_deleted = false
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY usage_date DESC;

CREATE UNIQUE INDEX ON "public"."sensor_usage_summary" (usage_date);

-- Performance metrics summary (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS "public"."performance_metrics_summary" AS
SELECT 
    DATE_TRUNC('hour', timestamp) as metric_hour,
    metric_name,
    COUNT(*) as measurement_count,
    AVG(metric_value::numeric) as avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value::numeric) as median_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value::numeric) as p95_value,
    COUNT(CASE WHEN metric_rating = 'good' THEN 1 END) as good_count,
    COUNT(CASE WHEN metric_rating = 'needs-improvement' THEN 1 END) as needs_improvement_count,
    COUNT(CASE WHEN metric_rating = 'poor' THEN 1 END) as poor_count
FROM public.web_vitals 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), metric_name
ORDER BY metric_hour DESC, metric_name;

CREATE UNIQUE INDEX ON "public"."performance_metrics_summary" (metric_hour, metric_name);

-- ============================================================================
-- OPTIMIZED FUNCTIONS
-- ============================================================================

-- Fast user stats function
CREATE OR REPLACE FUNCTION "public"."get_user_stats"(days_back integer DEFAULT 30)
RETURNS TABLE(
    total_users bigint,
    active_users bigint,
    new_users bigint,
    retention_rate numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '1 day' * days_back THEN 1 END) as active,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' * days_back THEN 1 END) as new_signups
        FROM profiles
    ),
    retention AS (
        SELECT 
            CASE 
                WHEN COUNT(CASE WHEN created_at <= NOW() - INTERVAL '1 day' * days_back THEN 1 END) > 0
                THEN (COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '1 day' * (days_back/2) 
                                 AND created_at <= NOW() - INTERVAL '1 day' * days_back THEN 1 END)::numeric / 
                      COUNT(CASE WHEN created_at <= NOW() - INTERVAL '1 day' * days_back THEN 1 END)::numeric) * 100
                ELSE 0
            END as rate
        FROM profiles
    )
    SELECT s.total, s.active, s.new_signups, r.rate
    FROM stats s, retention r;
END;
$$;

-- Fast sensor stats function
CREATE OR REPLACE FUNCTION "public"."get_sensor_stats"(days_back integer DEFAULT 30)
RETURNS TABLE(
    total_sensors bigint,
    active_sensors bigint,
    problematic_sensors bigint,
    avg_wear_duration numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN archived_at IS NULL AND is_deleted = false THEN 1 END) as active,
        COUNT(CASE WHEN is_problematic = true AND is_deleted = false THEN 1 END) as problematic,
        COALESCE(AVG(
            CASE 
                WHEN archived_at IS NOT NULL AND date_added IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (archived_at - date_added)) / 86400 
            END
        ), 14) as avg_duration
    FROM sensors
    WHERE created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$;

-- ============================================================================
-- AUTOMATIC MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION "public"."refresh_analytics_views"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Refresh views concurrently to avoid blocking
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY sensor_usage_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY performance_metrics_summary;
    
    -- Log the refresh
    INSERT INTO system_logs (level, category, message, metadata)
    VALUES ('info', 'maintenance', 'Analytics views refreshed', 
            jsonb_build_object('timestamp', NOW(), 'views_refreshed', 3));
END;
$$;

-- Function to clean old data
CREATE OR REPLACE FUNCTION "public"."cleanup_old_data"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Clean old system logs (keep 90 days)
    DELETE FROM system_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean old web vitals (keep 30 days)
    DELETE FROM web_vitals 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Log cleanup activity
    INSERT INTO system_logs (level, category, message, metadata)
    VALUES ('info', 'maintenance', 'Old data cleanup completed', 
            jsonb_build_object('logs_deleted', deleted_count, 'timestamp', NOW()));
END;
$$;

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- Function to analyze slow queries
CREATE OR REPLACE FUNCTION "public"."get_performance_insights"()
RETURNS TABLE(
    metric_name text,
    avg_response_time numeric,
    p95_response_time numeric,
    error_rate numeric,
    recommendation text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH perf_data AS (
        SELECT 
            wv.metric_name,
            AVG(wv.metric_value::numeric) as avg_val,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wv.metric_value::numeric) as p95_val,
            COUNT(CASE WHEN wv.metric_rating = 'poor' THEN 1 END)::numeric / COUNT(*)::numeric * 100 as error_pct
        FROM web_vitals wv
        WHERE wv.timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY wv.metric_name
    )
    SELECT 
        pd.metric_name,
        ROUND(pd.avg_val, 2),
        ROUND(pd.p95_val, 2),
        ROUND(pd.error_pct, 2),
        CASE 
            WHEN pd.metric_name = 'LCP' AND pd.p95_val > 4000 THEN 'Consider optimizing images and server response time'
            WHEN pd.metric_name = 'INP' AND pd.p95_val > 500 THEN 'Optimize JavaScript execution and reduce main thread blocking'
            WHEN pd.metric_name = 'CLS' AND pd.p95_val > 0.25 THEN 'Fix layout shifts by setting image dimensions and avoiding dynamic content'
            WHEN pd.metric_name = 'FCP' AND pd.p95_val > 3000 THEN 'Optimize critical rendering path and reduce render-blocking resources'
            ELSE 'Performance is within acceptable range'
        END
    FROM perf_data pd;
END;
$$;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant access to materialized views
GRANT SELECT ON "public"."user_activity_summary" TO authenticated;
GRANT SELECT ON "public"."sensor_usage_summary" TO authenticated;
GRANT SELECT ON "public"."performance_metrics_summary" TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION "public"."get_user_stats"(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_sensor_stats"(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_performance_insights"() TO authenticated;

-- Only service role can refresh views and cleanup data
GRANT EXECUTE ON FUNCTION "public"."refresh_analytics_views"() TO service_role;
GRANT EXECUTE ON FUNCTION "public"."cleanup_old_data"() TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW "public"."user_activity_summary" IS 'Daily user activity metrics for analytics dashboard';
COMMENT ON MATERIALIZED VIEW "public"."sensor_usage_summary" IS 'Daily sensor usage statistics for monitoring';
COMMENT ON MATERIALIZED VIEW "public"."performance_metrics_summary" IS 'Hourly performance metrics aggregation';

COMMENT ON FUNCTION "public"."get_user_stats"(integer) IS 'Fast user statistics calculation for dashboard';
COMMENT ON FUNCTION "public"."get_sensor_stats"(integer) IS 'Fast sensor statistics calculation for dashboard';
COMMENT ON FUNCTION "public"."refresh_analytics_views"() IS 'Refresh all materialized views for analytics';
COMMENT ON FUNCTION "public"."cleanup_old_data"() IS 'Clean up old logs and performance data';
COMMENT ON FUNCTION "public"."get_performance_insights"() IS 'Analyze performance metrics and provide recommendations';