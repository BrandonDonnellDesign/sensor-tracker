-- Re-enable RLS with proper policy for tags
-- This creates a policy that allows reading predefined tags

-- Re-enable RLS on tags table
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Drop the old policy and create a new one that works
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
DROP POLICY IF EXISTS "Users can view tags" ON public.tags;

-- Create a policy that allows anyone (including service role) to read tags
-- Since these are predefined tags, they should be readable by all authenticated users
CREATE POLICY "Allow reading predefined tags" ON public.tags
    FOR SELECT 
    USING (true);

-- Test that the policy works
SELECT COUNT(*) as tags_with_new_policy FROM public.tags;