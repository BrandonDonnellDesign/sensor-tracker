-- Migration: Comprehensive RLS audit and fixes
-- Created: 2025-10-30
-- Description: Ensures all tables have appropriate RLS policies for security

-- Function to check and enable RLS on tables that should have it
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- List of tables that should have RLS enabled
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'web_vitals_metrics',
            'performance_metrics', 
            'admin_logs',
            'audit_logs',
            'user_sessions',
            'api_usage_logs'
        )
    LOOP
        -- Enable RLS if not already enabled
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
        
        -- Add basic policies for service role (drop first if exists)
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %I" ON %I', table_record.table_name, table_record.table_name);
        EXECUTE format('
            CREATE POLICY "Service role full access on %I" ON %I
            FOR ALL USING (auth.role() = ''service_role'')
        ', table_record.table_name, table_record.table_name);
        
        RAISE NOTICE 'Enabled RLS and added policies for table: %', table_record.table_name;
    END LOOP;
END $$;

-- Specific policies for web_vitals_metrics if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'web_vitals_metrics') THEN
        -- Drop existing policies if they exist, then recreate
        DROP POLICY IF EXISTS "Authenticated users can read web vitals" ON web_vitals_metrics;
        DROP POLICY IF EXISTS "Only service role can modify web vitals" ON web_vitals_metrics;
        
        -- Allow authenticated users to read web vitals (for performance monitoring)
        CREATE POLICY "Authenticated users can read web vitals" ON web_vitals_metrics
            FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Only service role can insert/update/delete
        CREATE POLICY "Only service role can modify web vitals" ON web_vitals_metrics
            FOR INSERT WITH CHECK (auth.role() = 'service_role');
            
        GRANT SELECT ON web_vitals_metrics TO authenticated;
        GRANT ALL ON web_vitals_metrics TO service_role;
        
        RAISE NOTICE 'Added specific policies for web_vitals_metrics';
    END IF;
END $$;

-- Specific policies for performance_metrics if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        -- Drop existing policies if they exist, then recreate
        DROP POLICY IF EXISTS "Authenticated users can read performance metrics" ON performance_metrics;
        DROP POLICY IF EXISTS "Only service role can modify performance metrics" ON performance_metrics;
        
        -- Allow authenticated users to read performance metrics
        CREATE POLICY "Authenticated users can read performance metrics" ON performance_metrics
            FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Only service role can insert/update/delete
        CREATE POLICY "Only service role can modify performance metrics" ON performance_metrics
            FOR INSERT WITH CHECK (auth.role() = 'service_role');
            
        GRANT SELECT ON performance_metrics TO authenticated;
        GRANT ALL ON performance_metrics TO service_role;
        
        RAISE NOTICE 'Added specific policies for performance_metrics';
    END IF;
END $$;

-- Audit existing RLS status for tables and views
DO $$
DECLARE
    audit_record RECORD;
    view_record RECORD;
    rls_status TEXT;
BEGIN
    RAISE NOTICE 'RLS Audit Report:';
    RAISE NOTICE '==================';
    RAISE NOTICE 'TABLES:';
    
    FOR audit_record IN 
        SELECT 
            schemaname,
            tablename,
            rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        IF audit_record.rowsecurity THEN
            rls_status := 'ENABLED';
        ELSE
            rls_status := 'DISABLED';
        END IF;
        
        RAISE NOTICE 'Table: % - RLS: %', audit_record.tablename, rls_status;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'VIEWS (inherit security from underlying tables):';
    
    FOR view_record IN 
        SELECT 
            schemaname,
            viewname
        FROM pg_views 
        WHERE schemaname = 'public'
        ORDER BY viewname
    LOOP
        RAISE NOTICE 'View: % - Security: Inherited from underlying tables', view_record.viewname;
    END LOOP;
    
    RAISE NOTICE '==================';
END $$;

-- Add comments
COMMENT ON SCHEMA public IS 'Public schema with comprehensive RLS policies for security';