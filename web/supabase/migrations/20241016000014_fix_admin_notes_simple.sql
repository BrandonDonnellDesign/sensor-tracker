-- Simple Fix for admin_notes RLS Policy
-- This migration adds basic RLS policies without requiring user_roles table

-- Create simple RLS policies for admin_notes table

-- Policy 1: Only authenticated users can view admin notes
CREATE POLICY "Authenticated users can view admin notes" ON public.admin_notes
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

-- Policy 2: Only authenticated users can insert admin notes  
CREATE POLICY "Authenticated users can insert admin notes" ON public.admin_notes
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Users can update admin notes (if there's a user_id column)
-- If admin_notes has a user_id column, users can update their own notes
CREATE POLICY "Users can update admin notes" ON public.admin_notes
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL 
        AND (
            -- If there's a user_id column, check ownership
            (SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'admin_notes' AND column_name = 'user_id'))
            AND user_id = auth.uid()
        )
        OR
        -- If no user_id column, allow all authenticated users
        NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'admin_notes' AND column_name = 'user_id'))
    );

-- Policy 4: Users can delete admin notes (same logic as update)
CREATE POLICY "Users can delete admin notes" ON public.admin_notes
    FOR DELETE 
    USING (
        auth.uid() IS NOT NULL 
        AND (
            -- If there's a user_id column, check ownership
            (SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'admin_notes' AND column_name = 'user_id'))
            AND user_id = auth.uid()
        )
        OR
        -- If no user_id column, allow all authenticated users
        NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'admin_notes' AND column_name = 'user_id'))
    );

-- Alternative: If you want admin_notes to be truly admin-only
-- and you have an is_admin column in profiles, uncomment these instead:

/*
-- Drop the above policies first
DROP POLICY IF EXISTS "Authenticated users can view admin notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Authenticated users can insert admin notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Users can update admin notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Users can delete admin notes" ON public.admin_notes;

-- Admin-only policies (requires is_admin column in profiles)
CREATE POLICY "Only admins can view admin notes" ON public.admin_notes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

CREATE POLICY "Only admins can manage admin notes" ON public.admin_notes
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );
*/

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'admin_notes' AND schemaname = 'public'
ORDER BY policyname;