-- Migration: Simple RLS fix for performance-related tables
-- Created: 2025-10-30
-- Description: Applies RLS to performance tables that actually exist, handles views properly

-- Enable RLS on common performance tables if they exist
-- This approach is safer and more predictable

-- Check and secure web_vitals_metrics table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'web_vitals_metrics') THEN
        -- Enable RLS
        ALTER TABLE web_vitals_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "web_vitals_service_access" ON web_vitals_metrics;
        DROP POLICY IF EXISTS "web_vitals_read_access" ON web_vitals_metrics;
        
        -- Create new policies
        CREATE POLICY "web_vitals_service_access" ON web_vitals_metrics
            FOR ALL USING (auth.role() = 'service_role');
            
        CREATE POLICY "web_vitals_read_access" ON web_vitals_metrics
            FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT SELECT ON web_vitals_metrics TO authenticated;
        GRANT ALL ON web_vitals_metrics TO service_role;
        
        RAISE NOTICE 'Secured web_vitals_metrics table';
    ELSE
        RAISE NOTICE 'web_vitals_metrics table does not exist';
    END IF;
END $$;

-- Check and secure performance_metrics table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_metrics') THEN
        -- Enable RLS
        ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "performance_service_access" ON performance_metrics;
        DROP POLICY IF EXISTS "performance_read_access" ON performance_metrics;
        
        -- Create new policies
        CREATE POLICY "performance_service_access" ON performance_metrics
            FOR ALL USING (auth.role() = 'service_role');
            
        CREATE POLICY "performance_read_access" ON performance_metrics
            FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT SELECT ON performance_metrics TO authenticated;
        GRANT ALL ON performance_metrics TO service_role;
        
        RAISE NOTICE 'Secured performance_metrics table';
    ELSE
        RAISE NOTICE 'performance_metrics table does not exist';
    END IF;
END $$;

-- Handle performance_summary view permissions (not RLS, since it's a view)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'performance_summary') THEN
        -- Revoke public access
        REVOKE ALL ON performance_summary FROM PUBLIC;
        
        -- Grant specific access
        GRANT SELECT ON performance_summary TO authenticated;
        GRANT ALL ON performance_summary TO service_role;
        
        RAISE NOTICE 'Secured performance_summary view permissions';
    ELSE
        RAISE NOTICE 'performance_summary view does not exist';
    END IF;
END $$;

-- Show final status
DO $$
DECLARE
    table_count INTEGER := 0;
    view_count INTEGER := 0;
BEGIN
    -- Count secured tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename LIKE '%performance%' OR tablename LIKE '%vitals%';
    
    -- Count views
    SELECT COUNT(*) INTO view_count
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname LIKE '%performance%' OR viewname LIKE '%vitals%';
    
    RAISE NOTICE 'Security Summary:';
    RAISE NOTICE '- Tables with RLS enabled: %', table_count;
    RAISE NOTICE '- Views with managed permissions: %', view_count;
END $$;