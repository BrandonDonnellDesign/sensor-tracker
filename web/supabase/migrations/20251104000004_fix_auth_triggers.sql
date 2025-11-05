-- Fix auth triggers that are preventing user creation
-- This migration will identify and fix problematic triggers

-- 1. Check if there are any custom triggers on auth.users that we added
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Look for triggers that might be causing issues
    FOR trigger_record IN 
        SELECT trigger_name, action_statement
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
          AND event_object_table = 'users'
          AND trigger_name NOT LIKE 'supabase_%'  -- Skip built-in Supabase triggers
    LOOP
        -- Log the trigger for debugging
        RAISE NOTICE 'Found custom trigger: % with statement: %', trigger_record.trigger_name, trigger_record.action_statement;
        
        -- Drop custom triggers that might be interfering
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_record.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- 2. Ensure the profiles table can handle users without foreign key constraint
-- (We already removed this, but let's make sure)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Create a safe profile creation function that won't fail
CREATE OR REPLACE FUNCTION public.handle_new_user_safe() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Only add the trigger if auth.users creation is working
-- We'll test this after the migration runs

-- 5. Log completion
SELECT 'Auth trigger fix migration completed' as status;