-- Add admin role to profiles table
ALTER TABLE public.profiles
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create admin dashboard access policy
CREATE POLICY "Only admins can access admin functions" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR role = 'admin');