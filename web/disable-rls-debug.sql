-- Disable RLS temporarily for tags table to test
-- This is for debugging only

-- Disable RLS on tags table
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;

-- Test if this fixes the API
SELECT COUNT(*) as tags_without_rls FROM public.tags;

-- If the above works, we can re-enable RLS with a proper policy
-- ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- And create a policy that allows all users to read tags (since they're predefined)
-- DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
-- CREATE POLICY "Anyone can view predefined tags" ON public.tags
--     FOR SELECT 
--     USING (true);