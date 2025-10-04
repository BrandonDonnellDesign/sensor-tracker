-- Fix RLS policy for tags table
-- The tags table should be readable by all authenticated users since these are predefined tags

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view tags" ON public.tags;

-- Create a new policy that allows all authenticated users to read tags
CREATE POLICY "Authenticated users can view tags" ON public.tags
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Verify RLS is enabled
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Test the policy by selecting tags
SELECT id, name, category FROM public.tags LIMIT 5;