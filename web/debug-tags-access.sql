-- Check current RLS policies and test tags access
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist on the tags table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'tags';

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tags';

-- Try to select tags directly (this should work if you're logged in as an authenticated user)
SELECT id, name, category, color FROM public.tags LIMIT 5;

-- Check if there are any tags in the table
SELECT COUNT(*) as total_tags FROM public.tags;