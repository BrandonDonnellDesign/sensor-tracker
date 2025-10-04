-- Test notification timing integration
-- This migration creates a test scenario to validate user settings are working

-- First, ensure we have a test user profile with specific notification settings
-- (This would normally be done through the UI, but we can set up a test case)

-- Create a test notification timing scenario
-- Insert a sensor that should trigger notifications based on user settings

DO $$
DECLARE
  test_user_id UUID;
  test_sensor_id UUID;
BEGIN
  -- You can replace this with your actual user ID for testing
  -- test_user_id := 'your-user-id-here';
  
  -- Example: Create a sensor that expires in 3 days (should trigger warning)
  -- INSERT INTO public.sensors (
  --   id,
  --   user_id, 
  --   serial_number,
  --   lot_number,
  --   date_added,
  --   is_problematic,
  --   created_at,
  --   updated_at
  -- ) VALUES (
  --   gen_random_uuid(),
  --   test_user_id,
  --   'TEST-WARNING-3D',
  --   'LOT123',
  --   NOW() - INTERVAL '7 days', -- Added 7 days ago, expires in 3 days (10-day sensor)
  --   false,
  --   NOW(),
  --   NOW()
  -- );
  
  -- Example: Create a sensor that expires in 1 day (should trigger critical)
  -- INSERT INTO public.sensors (
  --   id,
  --   user_id,
  --   serial_number, 
  --   lot_number,
  --   date_added,
  --   is_problematic,
  --   created_at,
  --   updated_at
  -- ) VALUES (
  --   gen_random_uuid(),
  --   test_user_id,
  --   'TEST-CRITICAL-1D',
  --   'LOT456', 
  --   NOW() - INTERVAL '9 days', -- Added 9 days ago, expires in 1 day (10-day sensor)
  --   false,
  --   NOW(),
  --   NOW()
  -- );
  
  RAISE NOTICE 'Test notification setup complete. Update test_user_id and uncomment INSERT statements to test.';
END $$;