-- Fix existing food logs with missing nutrition data
-- Recalculate nutrition values based on food item data and serving sizes

UPDATE food_logs 
SET 
  total_calories = CASE 
    WHEN fi.energy_kcal IS NOT NULL AND fi.energy_kcal != '0' 
    THEN ROUND((CAST(fi.energy_kcal AS NUMERIC) * COALESCE(food_logs.serving_size, 100) / 100)::NUMERIC, 1)
    ELSE NULL 
  END,
  total_carbs_g = CASE 
    WHEN fi.carbohydrates_g IS NOT NULL AND fi.carbohydrates_g != '0' 
    THEN ROUND((CAST(fi.carbohydrates_g AS NUMERIC) * COALESCE(food_logs.serving_size, 100) / 100)::NUMERIC, 1)
    ELSE NULL 
  END,
  total_protein_g = CASE 
    WHEN fi.proteins_g IS NOT NULL AND fi.proteins_g != '0' 
    THEN ROUND((CAST(fi.proteins_g AS NUMERIC) * COALESCE(food_logs.serving_size, 100) / 100)::NUMERIC, 1)
    ELSE NULL 
  END,
  total_fat_g = CASE 
    WHEN fi.fat_g IS NOT NULL AND fi.fat_g != '0' 
    THEN ROUND((CAST(fi.fat_g AS NUMERIC) * COALESCE(food_logs.serving_size, 100) / 100)::NUMERIC, 1)
    ELSE NULL 
  END
FROM food_items fi
WHERE food_logs.food_item_id = fi.id
  AND (
    food_logs.total_calories IS NULL 
    OR food_logs.total_calories = 0 
    OR food_logs.total_carbs_g IS NULL 
    OR food_logs.total_carbs_g = 0
  );

-- Update serving_size for logs that don't have it set
UPDATE food_logs 
SET serving_size = 100
WHERE serving_size IS NULL;

-- Update serving_unit for logs that don't have it set  
UPDATE food_logs 
SET serving_unit = 'g'
WHERE serving_unit IS NULL;

-- For logs that were created with "1 serving" but stored as grams, 
-- update the user_serving_size and user_serving_unit for better display
UPDATE food_logs 
SET 
  user_serving_size = 1,
  user_serving_unit = 'serving'
WHERE user_serving_size IS NULL 
  AND user_serving_unit IS NULL
  AND EXISTS (
    SELECT 1 FROM food_items fi 
    WHERE fi.id = food_logs.food_item_id 
    AND (
      LOWER(fi.product_name) LIKE '%mcdonald%' 
      OR LOWER(fi.product_name) LIKE '%burger king%'
      OR LOWER(fi.product_name) LIKE '%large%'
      OR LOWER(fi.product_name) LIKE '%medium%'
      OR LOWER(fi.product_name) LIKE '%small%'
    )
  );