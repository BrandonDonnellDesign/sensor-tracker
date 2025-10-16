-- Basic Fix for admin_notes RLS Policy
-- Simple policies that don't reference non-existent columns

-- Create the most basic RLS policies for admin_notes table

-- Policy 1: All authenticated users can view admin notes
CREATE POLICY "Authenticated users can view admin notes" ON public.admin_notes
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

-- Policy 2: All authenticated users can insert admin notes
CREATE POLICY "Authenticated users can insert admin notes" ON public.admin_notes
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: All authenticated users can update admin notes
CREATE POLICY "Authenticated users can update admin notes" ON public.admin_notes
    FOR UPDATE 
    USING (auth.uid() IS NOT NULL);

-- Policy 4: All authenticated users can delete admin notes
CREATE POLICY "Authenticated users can delete admin notes" ON public.admin_notes
    FOR DELETE 
    USING (auth.uid() IS NOT NULL);

-- Verify the policies were created successfully
SELECT 
    tablename,
    policyname,
    cmd as operation,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'admin_notes' AND schemaname = 'public'
ORDER BY policyname;