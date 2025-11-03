-- Ensure custom food columns exist in food_items table
-- This migration ensures the schema is properly updated for custom food support

-- First, let's check and add the missing columns
DO $$
BEGIN
    -- Add created_by_user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'food_items' 
        AND column_name = 'created_by_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "public"."food_items" 
        ADD COLUMN "created_by_user_id" "uuid" REFERENCES "public"."profiles"("id");
        
        RAISE NOTICE 'Added created_by_user_id column to food_items';
    END IF;

    -- Add is_custom column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'food_items' 
        AND column_name = 'is_custom'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "public"."food_items" 
        ADD COLUMN "is_custom" boolean DEFAULT false;
        
        RAISE NOTICE 'Added is_custom column to food_items';
    END IF;

    -- Add is_public column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'food_items' 
        AND column_name = 'is_public'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "public"."food_items" 
        ADD COLUMN "is_public" boolean DEFAULT true;
        
        RAISE NOTICE 'Added is_public column to food_items';
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS "food_items_created_by_user_id_idx" 
ON "public"."food_items" USING "btree" ("created_by_user_id");

CREATE INDEX IF NOT EXISTS "food_items_is_custom_idx" 
ON "public"."food_items" USING "btree" ("is_custom");

CREATE INDEX IF NOT EXISTS "food_items_is_public_idx" 
ON "public"."food_items" USING "btree" ("is_public");

-- Enable RLS on food_items table if not already enabled
ALTER TABLE "public"."food_items" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Food items are publicly readable" ON "public"."food_items";
DROP POLICY IF EXISTS "Users can view all food items" ON "public"."food_items";
DROP POLICY IF EXISTS "Users can view food items" ON "public"."food_items";
DROP POLICY IF EXISTS "Users can create custom food items" ON "public"."food_items";
DROP POLICY IF EXISTS "Users can update their own custom food items" ON "public"."food_items";

-- Create comprehensive RLS policies
-- Allow all users to view public food items and their own custom foods
CREATE POLICY "Users can view food items" ON "public"."food_items"
    FOR SELECT USING (
        is_public = true OR 
        (created_by_user_id = auth.uid() AND is_custom = true)
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON "public"."food_items" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Update existing food items to have proper default values
UPDATE "public"."food_items" 
SET 
    is_custom = COALESCE(is_custom, false),
    is_public = COALESCE(is_public, true)
WHERE 
    is_custom IS NULL OR is_public IS NULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Custom food support migration completed successfully';
END $$;
-- U
pdate the food_logs_with_cgm view to include custom food columns
DROP VIEW IF EXISTS "public"."food_logs_with_cgm";

CREATE OR REPLACE VIEW "public"."food_logs_with_cgm" AS
SELECT 
    fl.id,
    fl.user_id,
    fl.food_item_id,
    fl.logged_at,
    fl.meal_type,
    fl.serving_size,
    fl.serving_unit,
    fl.user_serving_size,
    fl.user_serving_unit,
    fl.total_carbs_g,
    fl.total_calories,
    fl.total_protein_g,
    fl.total_fat_g,
    fl.notes,
    fl.created_at,
    fi.product_name,
    fi.brand,
    fi.barcode,
    fi.image_url,
    fi.energy_kcal,
    fi.carbohydrates_g,
    fi.proteins_g,
    fi.fat_g,
    fi.serving_size as food_serving_size,
    fi.serving_unit as food_serving_unit,
    -- Include custom food columns
    fi.created_by_user_id,
    fi.is_custom,
    fi.is_public,
    -- Add custom food name for display
    CASE 
        WHEN fi.is_custom = true THEN fi.product_name
        ELSE NULL
    END as custom_food_name,
    (
        SELECT json_build_object(
            'value', gr.value,
            'system_time', gr.system_time,
            'display_time', gr.display_time
        )
        FROM public.glucose_readings gr
        WHERE gr.user_id = fl.user_id
        AND gr.system_time BETWEEN fl.logged_at - INTERVAL '30 minutes' 
                                AND fl.logged_at + INTERVAL '3 hours'
        ORDER BY ABS(EXTRACT(EPOCH FROM (gr.system_time - fl.logged_at)))
        LIMIT 1
    ) as cgm_reading
FROM public.food_logs fl
JOIN public.food_items fi ON fl.food_item_id = fi.id;

-- Grant permissions on the updated view
GRANT SELECT ON "public"."food_logs_with_cgm" TO authenticated;

-- Additional success message for view update
DO $
BEGIN
    RAISE NOTICE 'Updated food_logs_with_cgm view to include custom food columns';
END $;