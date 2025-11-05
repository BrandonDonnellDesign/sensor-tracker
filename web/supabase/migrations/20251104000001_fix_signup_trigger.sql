-- Fix signup trigger that's causing 500 errors
-- The sync_user_email function was trying to update profiles that don't exist yet

-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS trigger_sync_user_email ON auth.users;

-- Create a safer version of the sync function that handles missing profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if profile exists, don't fail if it doesn't
  UPDATE profiles 
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  
  -- If no profile exists yet, that's okay - it will be created later
  -- Don't throw an error, just return NEW to continue the signup process
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger but make it safer
CREATE TRIGGER trigger_sync_user_email
  AFTER UPDATE OF email ON auth.users  -- Only on email updates, not INSERT
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Alternative: Create a function that ensures profile exists before syncing
CREATE OR REPLACE FUNCTION ensure_profile_and_sync_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update profile with email
  INSERT INTO profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for new user signups that ensures profile creation
CREATE TRIGGER trigger_ensure_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_profile_and_sync_email();

-- Update existing users who might not have profiles
INSERT INTO profiles (id, email, created_at, updated_at)
SELECT 
  au.id, 
  au.email, 
  au.created_at, 
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;