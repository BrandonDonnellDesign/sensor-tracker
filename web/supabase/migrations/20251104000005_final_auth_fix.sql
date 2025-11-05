-- Final auth fix - Make gamification trigger safe
-- This ensures user creation never fails due to gamification stats issues

-- Drop and recreate the gamification trigger with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created_gamification ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_gamification() CASCADE;

-- Create a robust gamification function that won't break user creation
CREATE OR REPLACE FUNCTION handle_new_user_gamification() 
RETURNS TRIGGER AS $$
BEGIN
  -- Try to create gamification stats, but don't fail if it doesn't work
  BEGIN
    INSERT INTO user_gamification_stats (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE LOG 'Gamification stats creation failed for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_gamification
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user_gamification();

-- Also add a safe profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user_profile() 
RETURNS TRIGGER AS $$
BEGIN
  -- Try to create profile, but don't fail if it doesn't work
  BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add profile creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user_profile();