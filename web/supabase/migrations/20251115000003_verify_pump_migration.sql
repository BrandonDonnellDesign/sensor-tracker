-- Verification Query: Check pump data migration status
-- Run this after the migration to verify everything worked correctly

-- Create a temporary view for migration statistics
CREATE OR REPLACE VIEW pump_migration_stats AS
SELECT 
  'insulin_logs' as source_table,
  COUNT(*) FILTER (WHERE migrated_to_pump = TRUE) as migrated_count,
  COUNT(*) FILTER (WHERE migrated_to_pump = FALSE OR migrated_to_pump IS NULL) as remaining_count,
  COUNT(*) as total_count
FROM insulin_logs
UNION ALL
SELECT 
  'pump_bolus_events' as source_table,
  COUNT(*) as migrated_count,
  0 as remaining_count,
  COUNT(*) as total_count
FROM pump_bolus_events
UNION ALL
SELECT 
  'pump_basal_events' as source_table,
  COUNT(*) as migrated_count,
  0 as remaining_count,
  COUNT(*) as total_count
FROM pump_basal_events
UNION ALL
SELECT 
  'pump_delivery_logs' as source_table,
  COUNT(*) as migrated_count,
  0 as remaining_count,
  COUNT(*) as total_count
FROM pump_delivery_logs;

-- Grant access to the view
GRANT SELECT ON pump_migration_stats TO authenticated;

-- Create a function to get detailed migration info for a user
CREATE OR REPLACE FUNCTION get_user_pump_migration_info(p_user_id UUID)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  earliest_date TIMESTAMPTZ,
  latest_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Original Insulin Logs (Pump)' as category,
    COUNT(*) as count,
    MIN(taken_at) as earliest_date,
    MAX(taken_at) as latest_date
  FROM insulin_logs
  WHERE user_id = p_user_id 
    AND migrated_to_pump = TRUE
  
  UNION ALL
  
  SELECT 
    'Pump Bolus Events' as category,
    COUNT(*) as count,
    MIN(timestamp) as earliest_date,
    MAX(timestamp) as latest_date
  FROM pump_bolus_events
  WHERE user_id = p_user_id
  
  UNION ALL
  
  SELECT 
    'Pump Basal Events' as category,
    COUNT(*) as count,
    MIN(timestamp) as earliest_date,
    MAX(timestamp) as latest_date
  FROM pump_basal_events
  WHERE user_id = p_user_id
  
  UNION ALL
  
  SELECT 
    'Pump Delivery Logs' as category,
    COUNT(*) as count,
    MIN(timestamp) as earliest_date,
    MAX(timestamp) as latest_date
  FROM pump_delivery_logs
  WHERE user_id = p_user_id
  
  UNION ALL
  
  SELECT 
    'Manual Insulin Logs (Remaining)' as category,
    COUNT(*) as count,
    MIN(taken_at) as earliest_date,
    MAX(taken_at) as latest_date
  FROM insulin_logs
  WHERE user_id = p_user_id 
    AND (migrated_to_pump = FALSE OR migrated_to_pump IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to compare IOB calculations before and after migration
CREATE OR REPLACE FUNCTION compare_iob_calculations(
  p_user_id UUID,
  p_at_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  source TEXT,
  iob_value NUMERIC,
  entry_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  -- IOB from original insulin_logs only
  SELECT 
    'insulin_logs_only' as source,
    COALESCE(SUM(
      units * EXP(-EXTRACT(EPOCH FROM (p_at_time - taken_at)) / 3600.0 / 4.0)
    ), 0) as iob_value,
    COUNT(*) as entry_count
  FROM insulin_logs
  WHERE user_id = p_user_id
    AND taken_at > p_at_time - INTERVAL '4 hours'
    AND taken_at <= p_at_time
    AND (migrated_to_pump = FALSE OR migrated_to_pump IS NULL)
  
  UNION ALL
  
  -- IOB from pump tables only
  SELECT 
    'pump_tables_only' as source,
    COALESCE(SUM(
      amount * EXP(-EXTRACT(EPOCH FROM (p_at_time - timestamp)) / 3600.0 / 4.0)
    ), 0) as iob_value,
    COUNT(*) as entry_count
  FROM pump_delivery_logs
  WHERE user_id = p_user_id
    AND timestamp > p_at_time - INTERVAL '4 hours'
    AND timestamp <= p_at_time
  
  UNION ALL
  
  -- Combined IOB (should match the calculate_total_iob function)
  SELECT 
    'combined_all_sources' as source,
    calculate_total_iob(p_user_id, p_at_time) as iob_value,
    (
      SELECT COUNT(*) 
      FROM all_insulin_delivery 
      WHERE user_id = p_user_id
        AND timestamp > p_at_time - INTERVAL '4 hours'
        AND timestamp <= p_at_time
    ) as entry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON VIEW pump_migration_stats IS 'Statistics about pump data migration from insulin_logs';
COMMENT ON FUNCTION get_user_pump_migration_info IS 'Get detailed migration information for a specific user';
COMMENT ON FUNCTION compare_iob_calculations IS 'Compare IOB calculations before and after migration';

-- Log the verification setup
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'pump',
  'Created pump migration verification tools',
  jsonb_build_object(
    'view', 'pump_migration_stats',
    'functions', ARRAY['get_user_pump_migration_info', 'compare_iob_calculations'],
    'created_at', NOW()
  )
);
