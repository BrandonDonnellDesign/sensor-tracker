-- Fix profile RLS policies to ensure updates work correctly

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create clear, non-conflicting policies
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;