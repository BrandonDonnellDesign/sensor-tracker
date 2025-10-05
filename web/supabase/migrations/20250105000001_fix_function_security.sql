-- Comprehensive security and performance optimization
-- Fixes function security and optimizes RLS policies in one migration

-- PART 1: Fix function security with proper search_path
-- This prevents SQL injection attacks by ensuring functions use a fixed search path

-- The trigger functions are now handled by the consolidated triggers migration
-- Only need to fix the archival functions here (they're in the simplified archival migration)

-- PART 2: Optimize RLS policies for performance
-- Replace auth.uid() with (SELECT auth.uid()) to prevent per-row evaluation

-- Optimize sensors table RLS policies
DROP POLICY IF EXISTS "Users can view their own sensors" ON public.sensors;
CREATE POLICY "Users can view their own sensors" ON public.sensors
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own sensors" ON public.sensors;
CREATE POLICY "Users can insert their own sensors" ON public.sensors
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own sensors" ON public.sensors;
CREATE POLICY "Users can update their own sensors" ON public.sensors
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own sensors" ON public.sensors;
CREATE POLICY "Users can delete their own sensors" ON public.sensors
    FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Optimize profiles table RLS policies (consolidate duplicates)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can access admin functions" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        id = (SELECT auth.uid()) OR 
        (SELECT (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin')::boolean = true
    );

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (id = (SELECT auth.uid()));

-- Optimize sensor_photos table RLS policies
DROP POLICY IF EXISTS "Users can view their own sensor photos" ON public.sensor_photos;
CREATE POLICY "Users can view their own sensor photos" ON public.sensor_photos
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own sensor photos" ON public.sensor_photos;
CREATE POLICY "Users can insert their own sensor photos" ON public.sensor_photos
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own sensor photos" ON public.sensor_photos;
CREATE POLICY "Users can delete their own sensor photos" ON public.sensor_photos
    FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Optimize sensor_tags table RLS policies (consolidate)
DROP POLICY IF EXISTS "Users can view their sensor tags" ON public.sensor_tags;
DROP POLICY IF EXISTS "Users can manage their sensor tags" ON public.sensor_tags;

CREATE POLICY "sensor_tags_policy" ON public.sensor_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sensors s 
            WHERE s.id = sensor_tags.sensor_id 
            AND s.user_id = (SELECT auth.uid())
        )
    );

-- Optimize notifications table RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Optimize tags table RLS policies (consolidate duplicates)
DROP POLICY IF EXISTS "Tags are viewable by all authenticated users" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;

CREATE POLICY "tags_select_policy" ON public.tags
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

-- Optimize sensor_models table RLS policies
DROP POLICY IF EXISTS "Sensor models are viewable by authenticated users" ON public.sensor_models;
DROP POLICY IF EXISTS "Admins can insert sensor models" ON public.sensor_models;
DROP POLICY IF EXISTS "Admins can update sensor models" ON public.sensor_models;
DROP POLICY IF EXISTS "Admins can delete sensor models" ON public.sensor_models;

CREATE POLICY "sensor_models_select_policy" ON public.sensor_models
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "sensor_models_admin_policy" ON public.sensor_models
    FOR ALL USING (
        (SELECT (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin')::boolean = true
    );

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_sensors_user_id_optimized ON public.sensors(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sensor_photos_user_id_optimized ON public.sensor_photos(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_optimized ON public.notifications(user_id) WHERE user_id IS NOT NULL;