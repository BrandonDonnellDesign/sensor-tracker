-- Quick Database Functions Setup
-- Run this if you can't apply full migrations but need the functions

-- Simple fallback function for refresh_analytics_views
CREATE OR REPLACE FUNCTION "public"."refresh_analytics_views"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Log that we attempted to refresh
    BEGIN
        INSERT INTO system_logs (level, category, message, metadata)
        VALUES ('info', 'maintenance', 'Analytics views refresh attempted', 
                jsonb_build_object('timestamp', NOW(), 'status', 'fallback'));
    EXCEPTION WHEN OTHERS THEN
        -- system_logs table might not exist, continue
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
BEGIN
    -- Try to clean old system logs if table exists
    BEGIN
        DELETE FROM system_logs 
        WHERE created_at < NOW() - INTERVAL '90 days';
    EXCEPTION WHEN OTHERS THEN
        -- Table might not exist, continue
        NULL;
    END;
    
    -- Try to clean old web vitals if table exists
    BEGIN
        DELETE FROM web_vitals 
        WHERE timestamp < NOW() - INTERVAL '30 days';
    EXCEPTION WHEN OTHERS THEN
        -- Table might not exist, continue
        NULL;
    END;
    
    -- Log cleanup activity
    BEGIN
        INSERT INTO system_logs (level, category, message, metadata)
        VALUES ('info', 'maintenance', 'Basic cleanup completed', 
                jsonb_build_object('timestamp', NOW()));
    EXCEPTION WHEN OTHERS THEN
        -- system_logs table might not exist, continue
        NULL;
    END;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION "public"."refresh_analytics_views"() TO service_role;
GRANT EXECUTE ON FUNCTION "public"."cleanup_old_data"() TO service_role;
GRANT EXECUTE ON FUNCTION "public"."get_performance_insights"() TO authenticated;