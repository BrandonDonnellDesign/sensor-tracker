-- Quick fix for RLS issues on tags table
-- Run this in your Supabase SQL editor

-- Enable RLS on tags table (this should fix both errors)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Verify the fix worked
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tags';