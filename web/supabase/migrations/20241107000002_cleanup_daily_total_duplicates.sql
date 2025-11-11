-- Clean up daily total bolus entries that were imported as individual doses
-- These are the duplicate entries from the insulin_data summary file

-- Delete entries that match the daily totals pattern
-- (entries with large amounts at end-of-day timestamps that are daily totals)

DELETE FROM insulin_logs 
WHERE logged_via = 'csv_import'
  AND delivery_type = 'bolus'
  AND (
    -- Specific daily totals from your data
    (DATE(taken_at) = '2025-11-06' AND units = 13.3 AND EXTRACT(hour FROM taken_at) = 15 AND EXTRACT(minute FROM taken_at) = 13) OR
    (DATE(taken_at) = '2025-11-05' AND units = 7.3 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-11-04' AND units = 8.75 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-11-03' AND units = 24.1 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-11-02' AND units = 24.65 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-11-01' AND units = 35.5 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-10-31' AND units = 7.15 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-10-30' AND units = 8.3 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-10-29' AND units = 12.1 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 58) OR
    (DATE(taken_at) = '2025-10-28' AND units = 24.85 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 57) OR
    (DATE(taken_at) = '2025-10-27' AND units = 19.65 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 56) OR
    (DATE(taken_at) = '2025-10-26' AND units = 10.3 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 7) OR
    (DATE(taken_at) = '2025-10-25' AND units = 9.4 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 56) OR
    (DATE(taken_at) = '2025-10-24' AND units = 11.05 AND EXTRACT(hour FROM taken_at) = 23 AND EXTRACT(minute FROM taken_at) = 56)
  );

-- Alternative approach: Delete any imported bolus entries that are unusually large
-- and at end-of-day times (likely daily totals)
DELETE FROM insulin_logs 
WHERE logged_via = 'csv_import'
  AND delivery_type = 'bolus'
  AND units > 15  -- Individual bolus doses are typically under 15u
  AND (
    EXTRACT(hour FROM taken_at) >= 23 OR  -- Late night timestamps
    EXTRACT(hour FROM taken_at) <= 1      -- Early morning timestamps
  );

-- Clean up any remaining obvious daily totals
-- (Large doses that are clearly not individual bolus amounts)
DELETE FROM insulin_logs 
WHERE logged_via = 'csv_import'
  AND delivery_type = 'bolus'
  AND units > 20  -- Definitely daily totals, not individual doses
  AND notes LIKE '%Imported from Glooko%';

-- Show what was cleaned up
SELECT 
  'Cleanup completed' as status,
  COUNT(*) as remaining_imported_entries
FROM insulin_logs 
WHERE logged_via = 'csv_import';