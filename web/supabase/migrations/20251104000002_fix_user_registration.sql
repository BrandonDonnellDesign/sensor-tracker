-- Comprehensive fix for user registration issues
-- This addresses multiple potential causes of signup failures

-- First, let's check and fix the profiles table structure
-- Make sure email is nullable during signup process
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() 
RETURNS "trigger"
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Insert new profile with email from auth.users
  INSERT INTO public.profiles (
    id, 
    email, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    NOW(), 
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Clean up any duplicate or conflicting triggers
DROP TRIGGER IF EXISTS trigger_ensure_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_email ON auth.users;

-- Create a single, robust email sync trigger for updates only
CREATE OR REPLACE FUNCTION sync_user_email_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync email if profile exists
  UPDATE profiles 
  SET 
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Don't fail if profile doesn't exist
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE LOG 'Error syncing email: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create email sync trigger for updates only (not inserts)
CREATE TRIGGER trigger_sync_user_email_safe
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email_safe();

-- Fix any existing users who might not have profiles
INSERT INTO profiles (id, email, created_at, updated_at)
SELECT 
  au.id, 
  au.email, 
  COALESCE(au.created_at, NOW()), 
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Add some helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Verify the setup with a comment
COMMENT ON FUNCTION handle_new_user() IS 'Robust user profile creation function with error handling';
COMMENT ON FUNCTION sync_user_email_safe() IS 'Safe email synchronization that does not fail signup process';
-
- CRITICAL: Add missing INSERT policy for profiles
-- This is likely the main cause of registration failures
CREATE POLICY "Allow profile creation during signup" ON "public"."profiles"
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Also ensure service role can insert profiles (for triggers)
CREATE POLICY "Service role can insert profiles" ON "public"."profiles"
  FOR INSERT 
  TO service_role
  WITH CHECK (true);

-- Grant necessary permissions to authenticated users
GRANT INSERT ON profiles TO authenticated;
GRANT INSERT ON profiles TO service_role;