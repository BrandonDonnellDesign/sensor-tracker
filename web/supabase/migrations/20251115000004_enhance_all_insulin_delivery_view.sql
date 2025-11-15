-- Enhance all_insulin_delivery view to be compatible with existing insulin_logs queries
-- Uses same column names (units, taken_at) for easy drop-in replacement

DROP VIEW IF EXISTS all_insulin_delivery;

CREATE OR REPLACE VIEW all_insulin_delivery AS
SELECT 
  id,
  user_id,
  taken_at,
  units,
  insulin_type,
  insulin_name,
  delivery_type,
  meal_relation,
  injection_site,
  blood_glucose_before,
  blood_glucose_after,
  notes,
  mood,
  activity_level,
  'manual' as source,
  logged_via,
  created_at,
  updated_at
FROM insulin_logs
WHERE migrated_to_pump = FALSE OR migrated_to_pump IS NULL
UNION ALL
SELECT 
  id,
  user_id,
  timestamp as taken_at,
  amount as units,
  (metadata->>'insulin_type')::text as insulin_type,
  (metadata->>'insulin_name')::text as insulin_name,
  delivery_type,
  (metadata->>'meal_relation')::text as meal_relation,
  (metadata->>'injection_site')::text as injection_site,
  (metadata->>'blood_glucose_before')::numeric as blood_glucose_before,
  (metadata->>'blood_glucose_after')::numeric as blood_glucose_after,
  (metadata->>'notes')::text as notes,
  (metadata->>'mood')::text as mood,
  (metadata->>'activity_level')::text as activity_level,
  'pump' as source,
  (metadata->>'logged_via')::text as logged_via,
  created_at,
  created_at as updated_at
FROM pump_delivery_logs
ORDER BY taken_at DESC;

-- Grant access to view
GRANT SELECT ON all_insulin_delivery TO authenticated;

-- Add helpful comment
COMMENT ON VIEW all_insulin_delivery IS 'Unified view of all insulin delivery (manual + pump) with full column compatibility for easy migration from insulin_logs queries';

-- Log the enhancement
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'pump',
  'Enhanced all_insulin_delivery view with additional columns',
  jsonb_build_object(
    'columns_added', ARRAY['insulin_type', 'insulin_name', 'meal_relation', 'injection_site', 'blood_glucose_before', 'blood_glucose_after', 'notes', 'logged_via', 'updated_at'],
    'purpose', 'Easier migration from insulin_logs queries',
    'updated_at', NOW()
  )
);
