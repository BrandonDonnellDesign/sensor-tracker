-- Fix food_logs_with_cgm view to provide 1hr and 2hr post-meal CGM readings
-- This updates the view to match what the UI component expects

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
    -- 1 hour post-meal CGM reading
    (
        SELECT gr.value
        FROM public.glucose_readings gr
        WHERE gr.user_id = fl.user_id
        AND gr.system_time BETWEEN fl.logged_at + INTERVAL '45 minutes' 
                                AND fl.logged_at + INTERVAL '75 minutes'
        ORDER BY ABS(EXTRACT(EPOCH FROM (gr.system_time - (fl.logged_at + INTERVAL '1 hour'))))
        LIMIT 1
    ) as cgm_1hr_post_meal,
    -- 2 hour post-meal CGM reading
    (
        SELECT gr.value
        FROM public.glucose_readings gr
        WHERE gr.user_id = fl.user_id
        AND gr.system_time BETWEEN fl.logged_at + INTERVAL '105 minutes' 
                                AND fl.logged_at + INTERVAL '135 minutes'
        ORDER BY ABS(EXTRACT(EPOCH FROM (gr.system_time - (fl.logged_at + INTERVAL '2 hours'))))
        LIMIT 1
    ) as cgm_2hr_post_meal,
    -- Pre-meal CGM reading (for context)
    (
        SELECT gr.value
        FROM public.glucose_readings gr
        WHERE gr.user_id = fl.user_id
        AND gr.system_time BETWEEN fl.logged_at - INTERVAL '15 minutes' 
                                AND fl.logged_at + INTERVAL '15 minutes'
        ORDER BY ABS(EXTRACT(EPOCH FROM (gr.system_time - fl.logged_at)))
        LIMIT 1
    ) as cgm_pre_meal,
    -- Insulin dose taken around meal time (within 30 minutes before or after)
    (
        SELECT json_build_object(
            'units', il.units,
            'insulin_name', il.insulin_name,
            'insulin_type', il.insulin_type,
            'delivery_type', il.delivery_type,
            'taken_at', il.taken_at
        )
        FROM public.insulin_logs il
        WHERE il.user_id = fl.user_id
        AND il.delivery_type IN ('bolus', 'meal') -- Only meal-related insulin
        AND il.taken_at BETWEEN fl.logged_at - INTERVAL '30 minutes' 
                             AND fl.logged_at + INTERVAL '30 minutes'
        ORDER BY ABS(EXTRACT(EPOCH FROM (il.taken_at - fl.logged_at)))
        LIMIT 1
    ) as insulin_dose,
    -- Total insulin units for the meal (sum of all doses within 30 minutes)
    (
        SELECT COALESCE(SUM(il.units), 0)
        FROM public.insulin_logs il
        WHERE il.user_id = fl.user_id
        AND il.delivery_type IN ('bolus', 'meal')
        AND il.taken_at BETWEEN fl.logged_at - INTERVAL '30 minutes' 
                             AND fl.logged_at + INTERVAL '30 minutes'
    ) as total_insulin_units
FROM public.food_logs fl
JOIN public.food_items fi ON fl.food_item_id = fi.id;

-- Grant permissions on the updated view
GRANT SELECT ON "public"."food_logs_with_cgm" TO authenticated;

-- Add helpful comment
COMMENT ON VIEW "public"."food_logs_with_cgm" IS 'Food logs with associated CGM readings at 1hr and 2hr post-meal intervals';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Updated food_logs_with_cgm view to include 1hr and 2hr post-meal CGM readings';
END $$;