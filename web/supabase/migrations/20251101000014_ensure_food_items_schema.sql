-- Ensure food_items table has the correct schema for the application
-- This migration handles any discrepancies between the original schema and what the app expects

-- Add product_name column if it doesn't exist (rename from name if needed)
DO $$
BEGIN
    -- Check if product_name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'food_items' 
        AND column_name = 'product_name'
        AND table_schema = 'public'
    ) THEN
        -- Check if name column exists and rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'food_items' 
            AND column_name = 'name'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE "public"."food_items" RENAME COLUMN "name" TO "product_name";
        ELSE
            -- Add product_name column if neither exists
            ALTER TABLE "public"."food_items" ADD COLUMN "product_name" text NOT NULL DEFAULT '';
        END IF;
    END IF;
END $$;

-- Ensure all the nutrition columns exist with correct names
ALTER TABLE "public"."food_items" 
ADD COLUMN IF NOT EXISTS "energy_kcal" numeric,
ADD COLUMN IF NOT EXISTS "carbohydrates_g" numeric,
ADD COLUMN IF NOT EXISTS "proteins_g" numeric,
ADD COLUMN IF NOT EXISTS "fat_g" numeric,
ADD COLUMN IF NOT EXISTS "fiber_g" numeric,
ADD COLUMN IF NOT EXISTS "sugars_g" numeric,
ADD COLUMN IF NOT EXISTS "sodium_mg" numeric,
ADD COLUMN IF NOT EXISTS "off_id" text,
ADD COLUMN IF NOT EXISTS "categories" text;

-- Drop old columns if they exist and are different
DO $$
BEGIN
    -- Only drop if the new columns exist and have data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'energy_kcal') THEN
        -- Drop old naming if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'calories_per_serving') THEN
            -- Migrate data first
            UPDATE "public"."food_items" SET energy_kcal = calories_per_serving WHERE energy_kcal IS NULL AND calories_per_serving IS NOT NULL;
            ALTER TABLE "public"."food_items" DROP COLUMN IF EXISTS "calories_per_serving";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'carbs_per_serving') THEN
            UPDATE "public"."food_items" SET carbohydrates_g = carbs_per_serving WHERE carbohydrates_g IS NULL AND carbs_per_serving IS NOT NULL;
            ALTER TABLE "public"."food_items" DROP COLUMN IF EXISTS "carbs_per_serving";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'protein_per_serving') THEN
            UPDATE "public"."food_items" SET proteins_g = protein_per_serving WHERE proteins_g IS NULL AND protein_per_serving IS NOT NULL;
            ALTER TABLE "public"."food_items" DROP COLUMN IF EXISTS "protein_per_serving";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'fat_per_serving') THEN
            UPDATE "public"."food_items" SET fat_g = fat_per_serving WHERE fat_g IS NULL AND fat_per_serving IS NOT NULL;
            ALTER TABLE "public"."food_items" DROP COLUMN IF EXISTS "fat_per_serving";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'fiber_per_serving') THEN
            UPDATE "public"."food_items" SET fiber_g = fiber_per_serving WHERE fiber_g IS NULL AND fiber_per_serving IS NOT NULL;
            ALTER TABLE "public"."food_items" DROP COLUMN IF EXISTS "fiber_per_serving";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'sugar_per_serving') THEN
            UPDATE "public"."food_items" SET sugars_g = sugar_per_serving WHERE sugars_g IS NULL AND sugar_per_serving IS NOT NULL;
            ALTER TABLE "public"."food_items" DROP COLUMN IF EXISTS "sugar_per_serving";
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_items' AND column_name = 'sodium_per_serving') THEN
            UPDATE "public"."food_items" SET sodium_mg = sodium_per_serving WHERE sodium_mg IS NULL AND sodium_per_serving IS NOT NULL;
            ALTER TABLE "public"."food_items" DROP COLUMN IF EXISTS "sodium_per_serving";
        END IF;
    END IF;
END $$;