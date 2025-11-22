-- Clean up duplicate basal entries across ALL dates, keeping only the most recent one per timestamp
-- This will delete older entries based on created_at timestamp

-- First, let's see what we're dealing with (for logging purposes)
DO $$
DECLARE
  duplicate_count INTEGER;
  total_duplicates INTEGER;
BEGIN
  -- Count how many timestamps have duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT timestamp, user_id, COUNT(*) as cnt
    FROM pump_delivery_logs
    WHERE delivery_type = 'basal'
    GROUP BY timestamp, user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Count total duplicate entries to be deleted
  SELECT COUNT(*) INTO total_duplicates
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, timestamp, delivery_type 
        ORDER BY created_at DESC
      ) as rn
    FROM pump_delivery_logs
    WHERE delivery_type = 'basal'
  ) ranked
  WHERE rn > 1;
  
  RAISE NOTICE 'Found % timestamps with duplicate basal entries', duplicate_count;
  RAISE NOTICE 'Will delete % duplicate entries from pump_delivery_logs', total_duplicates;
END $$;

-- Delete duplicate basal entries from pump_delivery_logs, keeping only the most recent
-- This processes ALL dates in the table
WITH deleted AS (
  DELETE FROM pump_delivery_logs
  WHERE id IN (
    SELECT id
    FROM (
      SELECT 
        id,
        timestamp,
        amount,
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, timestamp, delivery_type 
          ORDER BY created_at DESC
        ) as rn
      FROM pump_delivery_logs
      WHERE delivery_type = 'basal'
    ) ranked
    WHERE rn > 1
  )
  RETURNING id, timestamp, amount
)
SELECT COUNT(*) as deleted_count FROM deleted;

-- Delete duplicate basal entries from pump_basal_events, keeping only the most recent
-- This processes ALL dates in the table
WITH deleted AS (
  DELETE FROM pump_basal_events
  WHERE id IN (
    SELECT id
    FROM (
      SELECT 
        id,
        timestamp,
        basal_rate,
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, timestamp 
          ORDER BY created_at DESC
        ) as rn
      FROM pump_basal_events
    ) ranked
    WHERE rn > 1
  )
  RETURNING id, timestamp, basal_rate
)
SELECT COUNT(*) as deleted_count FROM deleted;

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Duplicate basal entries cleaned up successfully across all dates';
END $$;

-- Migration complete: Cleanup duplicate basal entries from Glooko imports, keeping most recent entry per timestamp
