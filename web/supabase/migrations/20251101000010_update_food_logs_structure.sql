-- Update food_logs table to match application expectations
-- Add missing columns for nutrition tracking

ALTER TABLE "public"."food_logs" 
ADD COLUMN IF NOT EXISTS "serving_size" numeric,
ADD COLUMN IF NOT EXISTS "serving_unit" text DEFAULT 'g',
ADD COLUMN IF NOT EXISTS "total_carbs_g" numeric,
ADD COLUMN IF NOT EXISTS "total_calories" numeric,
ADD COLUMN IF NOT EXISTS "total_protein_g" numeric,
ADD COLUMN IF NOT EXISTS "total_fat_g" numeric;

-- Update existing columns to match expected names
-- Keep old columns for backward compatibility but add new ones
-- The application will use the new column names

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "food_logs_serving_size_idx" ON "public"."food_logs" USING "btree" ("serving_size");
CREATE INDEX IF NOT EXISTS "food_logs_total_calories_idx" ON "public"."food_logs" USING "btree" ("total_calories");

-- Update the food_logs_with_cgm view to include new columns
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