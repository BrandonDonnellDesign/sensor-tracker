-- Test SQL to create sensors that should trigger notifications
-- Run this in Supabase SQL Editor to create test data

-- Create a sensor that expires tomorrow (should trigger "expiring soon")
INSERT INTO sensors (
  user_id, 
  serial_number,
  lot_number,
  sensor_model_id,
  date_added,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Uses your first user
  'TEST001EXPIRING',
  'LOT001',
  (SELECT id FROM sensor_models WHERE manufacturer = 'Dexcom' AND model_name = 'G7' LIMIT 1),
  CURRENT_DATE - INTERVAL '9 days', -- 9 days ago, expires in 1 day
  NOW(),
  NOW()
);

-- Create a sensor that expired yesterday (should trigger "expired")
INSERT INTO sensors (
  user_id, 
  serial_number,
  lot_number,
  sensor_model_id,
  date_added,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'TEST002EXPIRED',
  'LOT002',
  (SELECT id FROM sensor_models WHERE manufacturer = 'Dexcom' AND model_name = 'G7' LIMIT 1),
  CURRENT_DATE - INTERVAL '12 days', -- 12 days ago, expired 2 days ago
  NOW(),
  NOW()
);

-- Create a problematic sensor (should trigger "issue" notification)
INSERT INTO sensors (
  user_id, 
  serial_number,
  lot_number,
  sensor_model_id,
  date_added,
  is_problematic,
  issue_notes,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'TEST003ISSUE',
  'LOT003',
  (SELECT id FROM sensor_models WHERE manufacturer = 'Abbott' AND model_name = 'FreeStyle Libre' LIMIT 1),
  CURRENT_DATE - INTERVAL '5 days',
  true,
  'Test issue - sensor giving inaccurate readings',
  NOW(),
  NOW()
);

-- View the test sensors with their model information
SELECT 
  s.serial_number, 
  s.date_added, 
  s.is_problematic, 
  s.issue_notes,
  sm.manufacturer,
  sm.model_name,
  sm.duration_days
FROM sensors s
JOIN sensor_models sm ON s.sensor_model_id = sm.id
WHERE s.serial_number LIKE 'TEST%';