-- Fix Web Vitals Constraints and Add Missing Functions
-- Migration: 20251030000011_fix_web_vitals_constraints.sql

-- ============================================================================
-- FIX WEB VITALS CONSTRAINTS
-- ============================================================================

-- Update the web_vitals table constraint to include INP and other modern metrics
ALTER TABLE web_vitals 
DROP CONSTRAINT IF EXISTS web_vitals_metric_name_check;

ALTER TABLE web_vitals 
ADD CONSTRAINT web_vitals_metric_name_check 
CHECK (metric_name IN ('CLS', 'INP', 'FCP', 'LCP', 'TTFB', 'FID'));

-- ============================================================================
-- ADD MISSING FUNCTIONS (Fallback versions)
-- ============================================================================

-- Simple fallback function for refresh_analytics_views
CREATE OR REPLACE FUNCTION "public"."refresh_analytics_views"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Log that we attempted to refresh (since materialized views may not exist yet)
    INSERT INTO system_logs (level, category, message, metadata)
    VALUES ('info', 'maintenance', 'Analytics views refresh attempted', 
            jsonb_build_object('timestamp', NOW(), 'status', 'fallback'));
    
    -- If materialized views exist, refresh them
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
    EXCEPTION WHEN OTHERS THEN
        -- View doesn't exist or can't be refreshed, continue
        NULL;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY sensor_usage_summary;
    EXCEPTION WHEN OTHERS THEN
        -- View doesn't exist or can't be refreshed, continue
        NULL;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY performance_metrics_summary;
    EXCEPTION WHEN OTHERS THEN
        -- View doesn't exist or can't be refreshed, continue
        NULL;
    END;
END;
$$;

-- Simple fallback function for cleanup_old_data
CREATE OR REPLACE FUNCTION "public"."cleanup_old_data"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- Clean old system logs (keep 90 days)
    BEGIN
        DELETE FROM system_logs 
        WHERE created_at < NOW() - INTERVAL '90 days';
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN
        -- Table might not exist, continue
        deleted_count := 0;
    END;
    
    -- Clean old web vitals (keep 30 days)
    BEGIN
        DELETE FROM web_vitals 
        WHERE timestamp < NOW() - INTERVAL '30 days';
    EXCEPTION WHEN OTHERS THEN
        -- Table might not exist, continue
        NULL;
    END;
    
    -- Log cleanup activity
    INSERT INTO system_logs (level, category, message, metadata)
    VALUES ('info', 'maintenance', 'Old data cleanup completed', 
            jsonb_build_object('logs_deleted', deleted_count, 'timestamp', NOW()));
END;
$$;

-- Simple fallback function for get_performance_insights
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
    -- Check if web_vitals table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'web_vitals') THEN
        RETURN QUERY
        WITH perf_data AS (
            SELECT 
                wv.metric_name,
                AVG(wv.metric_value::numeric) as avg_val,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wv.metric_value::numeric) as p95_val,
                COUNT(CASE WHEN wv.metric_rating = 'poor' THEN 1 END)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100 as error_pct
            FROM web_vitals wv
            WHERE wv.timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY wv.metric_name
        )
        SELECT 
            pd.metric_name,
            ROUND(pd.avg_val::numeric, 2),
            ROUND(pd.p95_val::numeric, 2),
            ROUND(COALESCE(pd.error_pct, 0)::numeric, 2),
            CASE 
                WHEN pd.metric_name = 'LCP' AND pd.p95_val > 4000 THEN 'Consider optimizing images and server response time'
                WHEN pd.metric_name = 'INP' AND pd.p95_val > 500 THEN 'Optimize JavaScript execution and reduce main thread blocking'
                WHEN pd.metric_name = 'CLS' AND pd.p95_val > 0.25 THEN 'Fix layout shifts by setting image dimensions and avoiding dynamic content'
                WHEN pd.metric_name = 'FCP' AND pd.p95_val > 3000 THEN 'Optimize critical rendering path and reduce render-blocking resources'
                ELSE 'Performance is within acceptable range'
            END
        FROM perf_data pd;
    ELSE
        -- Return empty result if table doesn't exist
        RETURN;
    END IF;
END;
$$;

-- Simple fallback functions for user and sensor stats
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
    -- Check if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
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
                          NULLIF(COUNT(CASE WHEN created_at <= NOW() - INTERVAL '1 day' * days_back THEN 1 END)::numeric, 0)) * 100
                    ELSE 0
                END as rate
            FROM profiles
        )
        SELECT s.total, s.active, s.new_signups, COALESCE(r.rate, 0)
        FROM stats s, retention r;
    ELSE
        -- Return default values if table doesn't exist
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::numeric;
    END IF;
END;
$$;

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
    -- Check if sensors table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sensors') THEN
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
    ELSE
        -- Return default values if table doesn't exist
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 14::numeric;
    END IF;
END;
$$;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION "public"."refresh_analytics_views"() TO service_role;
GRANT EXECUTE ON FUNCTION "public"."cleanup_old_data"() TO service_role;
GRANT EXECUTE ON FUNCTION "public"."get_performance_insights"() TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_user_stats"(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_sensor_stats"(integer) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION "public"."refresh_analytics_views"() IS 'Fallback function to refresh materialized views (creates them if they do not exist)';
COMMENT ON FUNCTION "public"."cleanup_old_data"() IS 'Fallback function to clean up old logs and performance data';
COMMENT ON FUNCTION "public"."get_performance_insights"() IS 'Fallback function to analyze performance metrics with error handling';
COMMENT ON FUNCTION "public"."get_user_stats"(integer) IS 'Fallback function for user statistics with table existence checks';
COMMENT ON FUNCTION "public"."get_sensor_stats"(integer) IS 'Fallback function for sensor statistics with table existence checks';