-- Add role column to profiles table if it doesn't exist
-- This is a safe migration that can be run multiple times

DO $$ 
BEGIN
    -- Check if role column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role'
        AND table_schema = 'public'
    ) THEN
        -- Add role column with default value
        ALTER TABLE public.profiles 
        ADD COLUMN role text DEFAULT 'user';
        
        -- Add check constraint
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_role_check 
        CHECK (role = ANY (ARRAY['user'::text, 'admin'::text]));
        
        -- Create index for role column
        CREATE INDEX IF NOT EXISTS profiles_role_idx 
        ON public.profiles USING btree (role);
        
        -- Update your user to be admin (replace with your actual user ID)
        -- You can find your user ID in the Supabase dashboard or by checking auth.users
        UPDATE public.profiles 
        SET role = 'admin' 
        WHERE id = '501debf3-b5b8-4b8b-8b8b-8b8b8b8b8b8b';
        
        RAISE NOTICE 'Role column added to profiles table successfully';
    ELSE
        RAISE NOTICE 'Role column already exists in profiles table';
    END IF;
END $$;

-- Ensure RLS policies exist for admin access
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

    -- Add admin update access to profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" ON profiles
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM profiles admin_profile
                    WHERE admin_profile.id = auth.uid() 
                    AND admin_profile.role = 'admin'
                )
            );
    END IF;
END $$;