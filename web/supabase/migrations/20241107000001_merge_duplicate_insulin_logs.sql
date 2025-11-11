-- Merge duplicate insulin logs that should have been combined during import
-- This script identifies and merges manual entries with Glooko imports

-- Step 1: Merge manual entries with Glooko imports within 5 minutes
WITH manual_glooko_pairs AS (
  SELECT 
    m.id as manual_id,
    g.id as glooko_id,
    m.user_id,
    m.notes as manual_notes,
    g.notes as glooko_notes,
    g.units as glooko_units,
    g.taken_at as glooko_time,
    g.insulin_name as glooko_insulin_name,
    g.blood_glucose_before as glooko_bg,
    ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY ABS(EXTRACT(EPOCH FROM (g.taken_at - m.taken_at)))) as rn
  FROM insulin_logs m
  JOIN insulin_logs g ON (
    g.user_id = m.user_id 
    AND g.insulin_type = m.insulin_type
    AND g.logged_via = 'csv_import'
    AND g.taken_at BETWEEN (m.taken_at - INTERVAL '5 minutes') AND (m.taken_at + INTERVAL '5 minutes')
    AND g.id != m.id
  )
  WHERE m.logged_via IN ('manual', 'quick_dose', 'meal_logger', 'quick_bolus')
),
merge_updates AS (
  UPDATE insulin_logs 
  SET 
    units = p.glooko_units,
    insulin_name = COALESCE(p.glooko_insulin_name, insulin_name),
    taken_at = p.glooko_time,
    blood_glucose_before = COALESCE(p.glooko_bg, blood_glucose_before),
    notes = CASE 
      WHEN p.manual_notes IS NOT NULL AND p.manual_notes != '' THEN
        p.manual_notes || ' | Glooko data: ' || p.glooko_units || 'u' || 
        CASE WHEN p.glooko_notes IS NOT NULL AND p.glooko_notes != '' 
             THEN ' | ' || p.glooko_notes 
             ELSE '' 
        END
      ELSE 
        'Glooko data: ' || p.glooko_units || 'u' || 
        CASE WHEN p.glooko_notes IS NOT NULL AND p.glooko_notes != '' 
             THEN ' | ' || p.glooko_notes 
             ELSE '' 
        END
    END,
    updated_at = NOW()
  FROM manual_glooko_pairs p
  WHERE insulin_logs.id = p.manual_id AND p.rn = 1
  RETURNING p.glooko_id
)
-- Step 2: Delete the Glooko duplicates that were merged
DELETE FROM insulin_logs 
WHERE id IN (SELECT glooko_id FROM merge_updates);

-- Step 3: Remove exact duplicates (same user, type, dose, and minute)
WITH duplicate_groups AS (
  SELECT 
    user_id,
    insulin_type,
    units,
    DATE_TRUNC('minute', taken_at) as time_bucket,
    ARRAY_AGG(id ORDER BY 
      CASE logged_via 
        WHEN 'csv_import' THEN 1 
        ELSE 2 
      END, 
      created_at
    ) as all_ids
  FROM insulin_logs
  GROUP BY user_id, insulin_type, units, DATE_TRUNC('minute', taken_at)
  HAVING COUNT(*) > 1
)
DELETE FROM insulin_logs 
WHERE id IN (
  SELECT unnest(all_ids[2:]) 
  FROM duplicate_groups
);

-- Add a comment for future reference
COMMENT ON TABLE insulin_logs IS 'Insulin logs table - duplicates merged on 2024-11-07';

-- Show summary of what was processed
DO $$
BEGIN
  RAISE NOTICE 'Insulin log merge migration completed successfully';
  RAISE NOTICE 'Manual entries have been merged with corresponding Glooko imports';
  RAISE NOTICE 'Exact duplicates have been removed';
END;
$$;