-- EMERGENCY FIX for signup 500 errors
-- This is a minimal fix to get signups working immediately

-- Step 1: Temporarily disable the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_ensure_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_email ON auth.users;

-- Step 2: Make email column nullable to prevent NOT NULL constraint errors
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Step 3: Create the simplest possible profile creation function
CREATE OR REPLACE FUNCTION "public"."handle_new_user_simple"() 
RETURNS "trigger"
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
BEGIN
  -- Just insert the basic profile, ignore errors
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail signup if profile creation fails
    RETURN NEW;
END;
$$;

-- Step 4: Add the missing INSERT policy (this is critical!)
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Step 5: Grant INSERT permission to authenticated users
GRANT INSERT ON profiles TO authenticated;

-- Step 6: Create the trigger with the simple function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_simple();

-- Step 7: Verify RLS is properly configured
-- Check if profiles table has RLS enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'profiles' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 8: Create a backup profile for any users who might not have one
INSERT INTO profiles (id, email, created_at, updated_at)
SELECT 
  au.id, 
  au.email, 
  COALESCE(au.created_at, NOW()), 
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;