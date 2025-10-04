-- Fix RLS issue for tags table
-- This ensures RLS is enabled and policies are properly set

-- First, ensure RLS is enabled on the tags table
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Verify the policy exists, if not create it
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tags' 
        AND policyname = 'Tags are viewable by all authenticated users'
    ) THEN
        -- Create the policy if it doesn't exist
        EXECUTE 'CREATE POLICY "Tags are viewable by all authenticated users" ON public.tags
                 FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END
$$;

-- Also ensure the second policy exists if referenced in the error
DO $$
BEGIN
    -- Check if the second policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tags' 
        AND policyname = 'Authenticated users can view tags'
    ) THEN
        -- Create the policy if it doesn't exist (this might be a duplicate name)
        EXECUTE 'CREATE POLICY "Authenticated users can view tags" ON public.tags
                 FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END
$$;

-- Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tags';

-- Verify policies exist
SELECT 
    tablename,
    policyname,
    cmd as command_type
FROM pg_policies 
WHERE tablename = 'tags'
ORDER BY policyname;