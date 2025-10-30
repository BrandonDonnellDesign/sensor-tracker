-- Consolidated Admin and Security Features
-- Combines admin functionality, security fixes, and role management

-- Add role column to profiles if not exists
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "role" "text" DEFAULT 'user' NOT NULL;

-- Add admin constraint
ALTER TABLE "public"."profiles"
ADD CONSTRAINT IF NOT EXISTS "profiles_role_check" 
CHECK ("role" IN ('user', 'admin', 'moderator'));

-- Create admin views for user management
CREATE OR REPLACE VIEW "public"."admin_active_users_30d" AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at,
    p.updated_at,
    -- Count recent activity
    (
        SELECT COUNT(*)
        FROM public.sensors s
        WHERE s.user_id = p.id
        AND s.date_added >= NOW() - interval '30 days'
    ) as sensors_added_30d,
    (
        SELECT COUNT(*)
        FROM public.glucose_readings gr
        WHERE gr.user_id = p.id
        AND gr.created_at >= NOW() - interval '30 days'
    ) as glucose_readings_30d,
    (
        SELECT MAX(gr.created_at)
        FROM public.glucose_readings gr
        WHERE gr.user_id = p.id
    ) as last_glucose_reading
FROM public.profiles p
WHERE p.created_at >= NOW() - interval '30 days'
   OR EXISTS (
       SELECT 1 FROM public.sensors s 
       WHERE s.user_id = p.id 
       AND s.date_added >= NOW() - interval '30 days'
   )
   OR EXISTS (
       SELECT 1 FROM public.glucose_readings gr 
       WHERE gr.user_id = p.id 
       AND gr.created_at >= NOW() - interval '30 days'
   );

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update profiles RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Admins can view all profiles" ON "public"."profiles";

CREATE POLICY "Users can view own profile" ON "public"."profiles"
    FOR SELECT USING ("id" = "auth"."uid"());

CREATE POLICY "Users can update own profile" ON "public"."profiles"
    FOR UPDATE USING ("id" = "auth"."uid"());

CREATE POLICY "Admins can view all profiles" ON "public"."profiles"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update user roles" ON "public"."profiles"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create admin access policy for admin views
CREATE POLICY "Admins can access admin views" ON "public"."profiles"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Secure all admin functions with proper search paths
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
    current_user_role text;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can promote users';
    END IF;
    
    -- Promote the target user
    UPDATE public.profiles
    SET role = 'admin',
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to safely update user notes (admin only)
CREATE OR REPLACE FUNCTION public.update_user_admin_notes(
    target_user_id uuid,
    new_notes text
)
RETURNS boolean AS $$
DECLARE
    current_user_role text;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can update user notes';
    END IF;
    
    -- Update the user's admin notes
    UPDATE public.profiles
    SET admin_notes = new_notes,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add admin notes column if not exists
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "admin_notes" "text";

-- Grant permissions for admin functions
GRANT EXECUTE ON FUNCTION public.is_current_user_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_admin_notes TO authenticated;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");

COMMENT ON FUNCTION public.is_current_user_admin IS 'Checks if the current authenticated user has admin role';
COMMENT ON FUNCTION public.get_user_role IS 'Returns the role of a user (defaults to current user)';
COMMENT ON FUNCTION public.promote_to_admin IS 'Promotes a user to admin role (admin only)';
COMMENT ON FUNCTION public.update_user_admin_notes IS 'Updates admin notes for a user (admin only)';