-- Add admin access policies for better admin dashboard functionality

-- Ensure profiles table has proper admin access
-- First, check if admin policy already exists, if not create it
DO $$
BEGIN
    -- Add admin read access to profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles" ON profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles admin_profile
                    WHERE admin_profile.id = auth.uid() 
                    AND admin_profile.role = 'admin'
                )
            );
    END IF;

    -- Add admin read access to sensors if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sensors' 
        AND policyname = 'Admins can view all sensors'
    ) THEN
        CREATE POLICY "Admins can view all sensors" ON sensors
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles admin_profile
                    WHERE admin_profile.id = auth.uid() 
                    AND admin_profile.role = 'admin'
                )
            );
    END IF;

    -- Add admin read access to user_gamification_stats if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_gamification_stats' 
        AND policyname = 'Admins can view all gamification stats'
    ) THEN
        CREATE POLICY "Admins can view all gamification stats" ON user_gamification_stats
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles admin_profile
                    WHERE admin_profile.id = auth.uid() 
                    AND admin_profile.role = 'admin'
                )
            );
    END IF;
END $$;

-- Add some sample admin data for testing (optional)
-- You can uncomment and modify this section to create a test admin user
/*
-- Create a test admin user (replace with your actual email)
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@example.com',
    'Admin User',
    'admin',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET role = 'admin';
*/