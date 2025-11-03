-- Add support for user-created custom foods
-- Add fields to track custom foods and their creators

ALTER TABLE "public"."food_items" 
ADD COLUMN IF NOT EXISTS "created_by_user_id" "uuid" REFERENCES "public"."profiles"("id"),
ADD COLUMN IF NOT EXISTS "is_custom" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true;

-- Create index for better performance when searching custom foods
CREATE INDEX IF NOT EXISTS "food_items_created_by_user_id_idx" ON "public"."food_items" USING "btree" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "food_items_is_custom_idx" ON "public"."food_items" USING "btree" ("is_custom");

-- Update RLS policies for food_items to allow users to create custom foods
DROP POLICY IF EXISTS "Users can view all food items" ON "public"."food_items";
DROP POLICY IF EXISTS "Users can create custom food items" ON "public"."food_items";
DROP POLICY IF EXISTS "Users can update their own custom food items" ON "public"."food_items";

-- Allow all users to view public food items and their own custom foods
CREATE POLICY "Users can view food items" ON "public"."food_items"
    FOR SELECT USING (
        is_public = true OR 
        created_by_user_id = auth.uid()
    );

-- Allow authenticated users to create custom food items
CREATE POLICY "Users can create custom food items" ON "public"."food_items"
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by_user_id = auth.uid() AND
        is_custom = true
    );

-- Allow users to update their own custom food items
CREATE POLICY "Users can update their own custom food items" ON "public"."food_items"
    FOR UPDATE USING (
        created_by_user_id = auth.uid() AND
        is_custom = true
    ) WITH CHECK (
        created_by_user_id = auth.uid() AND
        is_custom = true
    );

-- Enable RLS on food_items table
ALTER TABLE "public"."food_items" ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON "public"."food_items" TO authenticated;

-- Update existing food items to be public and not custom (these are from APIs)
UPDATE "public"."food_items" 
SET is_custom = false, is_public = true, created_by_user_id = NULL
WHERE is_custom IS NULL OR is_custom = false;