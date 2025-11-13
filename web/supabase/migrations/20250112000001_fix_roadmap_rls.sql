-- Fix RLS policies for roadmap tables to allow admin operations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can insert roadmap features" ON "public"."roadmap_features";
DROP POLICY IF EXISTS "Admins can update roadmap features" ON "public"."roadmap_features";
DROP POLICY IF EXISTS "Admins can delete roadmap features" ON "public"."roadmap_features";

DROP POLICY IF EXISTS "Admins can insert roadmap tags" ON "public"."roadmap_tags";
DROP POLICY IF EXISTS "Admins can update roadmap tags" ON "public"."roadmap_tags";
DROP POLICY IF EXISTS "Admins can delete roadmap tags" ON "public"."roadmap_tags";

DROP POLICY IF EXISTS "Admins can insert roadmap items" ON "public"."roadmap_items";
DROP POLICY IF EXISTS "Admins can update roadmap items" ON "public"."roadmap_items";
DROP POLICY IF EXISTS "Admins can delete roadmap items" ON "public"."roadmap_items";

-- Create policies for roadmap_features
CREATE POLICY "Admins can insert roadmap features" ON "public"."roadmap_features"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

CREATE POLICY "Admins can update roadmap features" ON "public"."roadmap_features"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

CREATE POLICY "Admins can delete roadmap features" ON "public"."roadmap_features"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

-- Create policies for roadmap_tags
CREATE POLICY "Admins can insert roadmap tags" ON "public"."roadmap_tags"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

CREATE POLICY "Admins can update roadmap tags" ON "public"."roadmap_tags"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

CREATE POLICY "Admins can delete roadmap tags" ON "public"."roadmap_tags"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

-- Create policies for roadmap_items
CREATE POLICY "Admins can insert roadmap items" ON "public"."roadmap_items"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

CREATE POLICY "Admins can update roadmap items" ON "public"."roadmap_items"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );

CREATE POLICY "Admins can delete roadmap items" ON "public"."roadmap_items"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
            AND "profiles"."role" = 'admin'
        )
    );
