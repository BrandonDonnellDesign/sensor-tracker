-- Migration: Fix performance_summary view security
-- Created: 2025-10-30
-- Description: Secures performance_summary view by applying RLS to underlying tables and managing view permissions

-- Note: performance_summary is a VIEW, not a table
-- Views inherit security from their underlying tables
-- We need to secure the underlying tables and manage view permissions

-- First, let's check what tables the view depends on and secure them
DO $$
DECLARE
    view_def TEXT;
    table_name TEXT;
BEGIN
    -- Get the view definition to understand what tables it uses
    SELECT definition INTO view_def
    FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'performance_summary';
    
    IF view_def IS NOT NULL THEN
        RAISE NOTICE 'Found performance_summary view definition';
        
        -- Common performance-related tables that might need RLS
        FOR table_name IN 
            SELECT t.table_name
            FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND t.table_name IN (
                'web_vitals_metrics',
                'performance_metrics',
                'system_metrics',
                'api_metrics',
                'database_metrics'
            )
        LOOP
            -- Enable RLS on underlying tables
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
            
            -- Add service role policy (drop first if exists)
            EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %I" ON %I', table_name, table_name);
            EXECUTE format('
                CREATE POLICY "Service role full access on %I" ON %I
                FOR ALL USING (auth.role() = ''service_role'')
            ', table_name, table_name);
            
            -- Add authenticated read policy for performance data (drop first if exists)
            EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can read %I" ON %I', table_name, table_name);
            EXECUTE format('
                CREATE POLICY "Authenticated users can read %I" ON %I
                FOR SELECT USING (auth.role() = ''authenticated'')
            ', table_name, table_name);
            
            -- Grant permissions
            EXECUTE format('GRANT SELECT ON %I TO authenticated', table_name);
            EXECUTE format('GRANT ALL ON %I TO service_role', table_name);
            
            RAISE NOTICE 'Secured underlying table: %', table_name;
        END LOOP;
    ELSE
        RAISE NOTICE 'performance_summary view not found - it may not exist yet';
    END IF;
END $$;

-- Manage view permissions directly
-- Views don't use RLS, but we can control who can access them

-- Revoke public access to the view
REVOKE ALL ON performance_summary FROM PUBLIC;

-- Grant specific permissions
GRANT SELECT ON performance_summary TO authenticated;
GRANT ALL ON performance_summary TO service_role;

-- Create a security definer function to control view access if needed
CREATE OR REPLACE FUNCTION get_performance_summary()
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    recorded_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow authenticated users or service role
    IF auth.role() NOT IN ('authenticated', 'service_role') THEN
        RAISE EXCEPTION 'Access denied: insufficient privileges';
    END IF;
    
    -- Return the view data (if view exists)
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'performance_summary') THEN
        RETURN QUERY SELECT * FROM performance_summary;
    ELSE
        -- Return empty result if view doesn't exist
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_performance_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_summary() TO service_role;

-- Add comments
COMMENT ON FUNCTION get_performance_summary() IS 'Secure access function for performance_summary view with authentication check';