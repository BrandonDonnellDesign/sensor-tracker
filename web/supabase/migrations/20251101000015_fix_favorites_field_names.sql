-- Fix field name inconsistencies that might cause favorites API issues
-- Ensure the food_items table has the expected field names

-- The API expects 'product_name' but the table might have 'name'
-- This migration ensures consistency

DO $$
BEGIN
    -- Check if we need to add product_name field or if it already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'food_items' 
        AND column_name = 'product_name'
        AND table_schema = 'public'
    ) THEN
        -- If product_name doesn't exist, add it and copy from name if name exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'food_items' 
            AND column_name = 'name'
            AND table_schema = 'public'
        ) THEN
            -- Add product_name column
            ALTER TABLE "public"."food_items" ADD COLUMN "product_name" text;
            -- Copy data from name to product_name
            UPDATE "public"."food_items" SET "product_name" = "name" WHERE "product_name" IS NULL;
            -- Make product_name NOT NULL if name was NOT NULL
            ALTER TABLE "public"."food_items" ALTER COLUMN "product_name" SET NOT NULL;
        ELSE
            -- Neither exists, add product_name as required field
            ALTER TABLE "public"."food_items" ADD COLUMN "product_name" text NOT NULL DEFAULT '';
        END IF;
    END IF;
END $$;

-- Ensure the favorite_foods table has proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."favorite_foods" TO authenticated;

-- Make sure RLS is enabled on favorite_foods
ALTER TABLE "public"."favorite_foods" ENABLE ROW LEVEL SECURITY;

-- Recreate the RLS policy to ensure it's working correctly
DROP POLICY IF EXISTS "Users can manage their own favorite foods" ON "public"."favorite_foods";

CREATE POLICY "Users can manage their own favorite foods" ON "public"."favorite_foods"
    FOR ALL USING ("user_id" = "auth"."uid"());

-- Add some debugging info
DO $$
BEGIN
    RAISE NOTICE 'Favorites migration completed. Checking table structure...';
    
    -- Log the columns that exist
    PERFORM column_name 
    FROM information_schema.columns 
    WHERE table_name = 'food_items' 
    AND table_schema = 'public'
    AND column_name IN ('name', 'product_name');
    
    RAISE NOTICE 'Food items table columns checked.';
END $$;