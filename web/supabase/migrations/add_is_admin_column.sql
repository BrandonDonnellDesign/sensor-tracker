-- Add is_admin column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create an index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Set your user as admin (replace with your actual user ID or email)
-- Option 1: By user ID
-- UPDATE profiles SET is_admin = true WHERE id = '501debf3-24e5-4232-821e-3195ba408692';

-- Option 2: By email (uncomment and replace with your email)
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';

-- Verify
SELECT id, email, full_name, is_admin 
FROM profiles 
WHERE is_admin = true;
