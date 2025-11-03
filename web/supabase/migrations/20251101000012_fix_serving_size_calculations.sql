-- Fix food logs with incorrect nutrition calculations due to serving size conversion bug
-- This addresses the issue where adjusting from 100g to 1 serving resulted in 0 nutrition values

-- Update food logs where nutrition values are 0 but should be calculated
UPDATE food_logs 
SET 
  total_calories = CASE 
    WHEN fi.energy_kcal IS NOT NULL AND fi.energy_kcal != '0' AND COALESCE(food_logs.serving_size, 0) > 0
    THEN ROUND((CAST(fi.energy_kcal AS NUMERIC) * food_logs.serving_size / 100)::NUMERIC, 1)
    ELSE food_logs.total_calories 
  END,
  total_carbs_g = CASE 
    WHEN fi.carbohydrates_g IS NOT NULL AND fi.carbohydrates_g != '0' AND COALESCE(food_logs.serving_size, 0) > 0
    THEN ROUND((CAST(fi.carbohydrates_g AS NUMERIC) * food_logs.serving_size / 100)::NUMERIC, 1)
    ELSE food_logs.total_carbs_g 
  END,
  total_protein_g = CASE 
    WHEN fi.proteins_g IS NOT NULL AND fi.proteins_g != '0' AND COALESCE(food_logs.serving_size, 0) > 0
    THEN ROUND((CAST(fi.proteins_g AS NUMERIC) * food_logs.serving_size / 100)::NUMERIC, 1)
    ELSE food_logs.total_protein_g 
  END,
  total_fat_g = CASE 
    WHEN fi.fat_g IS NOT NULL AND fi.fat_g != '0' AND COALESCE(food_logs.serving_size, 0) > 0
    THEN ROUND((CAST(fi.fat_g AS NUMERIC) * food_logs.serving_size / 100)::NUMERIC, 1)
    ELSE food_logs.total_fat_g 
  END
FROM food_items fi
WHERE food_logs.food_item_id = fi.id
  AND (
    -- Only update logs where nutrition values are 0 or null but food item has nutrition data
    (COALESCE(food_logs.total_calories, 0) = 0 AND CAST(fi.energy_kcal AS NUMERIC) > 0) OR
    (COALESCE(food_logs.total_carbs_g, 0) = 0 AND CAST(fi.carbohydrates_g AS NUMERIC) > 0) OR
    (COALESCE(food_logs.total_protein_g, 0) = 0 AND CAST(fi.proteins_g AS NUMERIC) > 0) OR
    (COALESCE(food_logs.total_fat_g, 0) = 0 AND CAST(fi.fat_g AS NUMERIC) > 0)
  )
  AND COALESCE(food_logs.serving_size, 0) > 0;

-- Log the number of affected rows for monitoring
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Fixed nutrition calculations for % food log entries', affected_count;
END $$;