-- Migration: Secure web_vitals table (underlying table for performance_summary view)
-- Created: 2025-10-30
-- Description: Applies RLS to web_vitals table which will secure the performance_summary view

-- Enable RLS on web_vitals table
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "web_vitals_service_access" ON web_vitals;
DROP POLICY IF EXISTS "web_vitals_authenticated_read" ON web_vitals;
DROP POLICY IF EXISTS "web_vitals_public_read" ON web_vitals;

-- Create policy for service role (full access)
CREATE POLICY "web_vitals_service_access" ON web_vitals
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Create policy for authenticated users (read-only access to performance data)
CREATE POLICY "web_vitals_authenticated_read" ON web_vitals
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Grant appropriate permissions
GRANT SELECT ON web_vitals TO authenticated;
GRANT ALL ON web_vitals TO service_role;

-- Also secure the performance_summary view permissions
REVOKE ALL ON performance_summary FROM PUBLIC;
GRANT SELECT ON performance_summary TO authenticated;
GRANT ALL ON performance_summary TO service_role;

-- Verify the setup
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if RLS is enabled on web_vitals
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'web_vitals';
    
    -- Count policies on web_vitals
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'web_vitals';
    
    RAISE NOTICE 'Security Status:';
    RAISE NOTICE '- web_vitals RLS enabled: %', rls_enabled;
    RAISE NOTICE '- web_vitals policies count: %', policy_count;
    RAISE NOTICE '- performance_summary view permissions updated';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: performance_summary view will still show as "unrestricted" in Supabase UI';
    RAISE NOTICE 'This is normal - views inherit security from underlying tables';
END $$;