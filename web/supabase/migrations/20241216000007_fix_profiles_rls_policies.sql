-- Fix infinite recursion in profiles RLS policies

-- First, drop the problematic admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all sensors" ON sensors;
DROP POLICY IF EXISTS "Admins can view all gamification stats" ON user_gamification_stats;
DROP POLICY IF EXISTS "Admins can view all user achievements" ON user_achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON achievements;
DROP POLICY IF EXISTS "Admins can manage roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Admins can manage roadmap features" ON roadmap_features;
DROP POLICY IF EXISTS "Admins can manage roadmap dependencies" ON roadmap_dependencies;
DROP POLICY IF EXISTS "Admins can manage roadmap tags" ON roadmap_tags;

-- Create a simple policy for profiles that allows users to read their own profile
-- and allows anyone to read profiles (since we need this for admin checks)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Allow users to view and update their own profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a special policy that allows reading profiles for admin checks
-- This avoids recursion by not checking the profiles table within the policy
CREATE POLICY "Allow profile reads for admin checks" ON profiles
    FOR SELECT USING (true);

-- Now create admin policies that use a different approach
-- We'll use a function that checks admin status without causing recursion

-- Create a function to check if current user is admin (avoiding recursion)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the current user has admin role
    -- This function will be used in policies to avoid recursion
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- Now create admin policies using the function (for tables that need admin access)
-- Sensors admin policy
CREATE POLICY "Admins can view all sensors" ON sensors
    FOR SELECT USING (is_admin_user());

-- Roadmap admin policies (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_items') THEN
        CREATE POLICY "Admins can manage roadmap items" ON roadmap_items
            FOR ALL USING (is_admin_user());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_features') THEN
        CREATE POLICY "Admins can manage roadmap features" ON roadmap_features
            FOR ALL USING (is_admin_user());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_dependencies') THEN
        CREATE POLICY "Admins can manage roadmap dependencies" ON roadmap_dependencies
            FOR ALL USING (is_admin_user());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roadmap_tags') THEN
        CREATE POLICY "Admins can manage roadmap tags" ON roadmap_tags
            FOR ALL USING (is_admin_user());
    END IF;
END $$;

-- Gamification admin policies (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_gamification_stats') THEN
        CREATE POLICY "Admins can view all gamification stats" ON user_gamification_stats
            FOR SELECT USING (is_admin_user());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
        CREATE POLICY "Admins can view all user achievements" ON user_achievements
            FOR SELECT USING (is_admin_user());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements') THEN
        CREATE POLICY "Admins can manage achievements" ON achievements
            FOR ALL USING (is_admin_user());
    END IF;
END $$;