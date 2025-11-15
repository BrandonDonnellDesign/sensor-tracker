-- Fix notification type constraint to include 'smart_alert'
-- This fixes the error: new row for relation "notifications" violates check constraint "notifications_type_check"

-- First, check what types currently exist in the table
DO $$ 
DECLARE
    existing_types TEXT;
BEGIN
    SELECT string_agg(DISTINCT type, ', ') INTO existing_types
    FROM notifications;
    
    RAISE NOTICE 'Existing notification types: %', existing_types;
END $$;

-- Update any invalid notification types to 'info' before adding constraint
UPDATE notifications 
SET type = 'info' 
WHERE type NOT IN ('info', 'warning', 'error', 'success', 'smart_alert', 'alert', 'reminder', 'system');

-- Drop the existing constraint if it exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with 'smart_alert' included
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'warning', 'error', 'success', 'smart_alert', 'alert', 'reminder', 'system'));

-- Log the fix
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'notifications',
  'Fixed notification type constraint to include smart_alert',
  '{"allowed_types": ["info", "warning", "error", "success", "smart_alert", "alert", "reminder", "system"]}'::jsonb
)
ON CONFLICT DO NOTHING;
