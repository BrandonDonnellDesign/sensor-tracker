-- Migration: Cleanup notification templates
-- Description: Remove old/unused notification templates and keep only the ones we actually use

-- Delete all old sensor expiration templates that use deprecated types
DELETE FROM notification_templates 
WHERE type IN (
  'sensor_expiry_3_day',
  'sensor_expiry_1_day', 
  'sensor_expiry_day_of',
  'sensor_expiry_replacement_reminder',
  'sensor_expiry_grace_period'
);

-- Delete duplicate/old sensor_expiry_warning and sensor_expired templates
-- Keep only the ones we want (we'll identify by specific characteristics)
DELETE FROM notification_templates 
WHERE type = 'sensor_expiry_warning' 
AND (
  title_template LIKE '%Time to replace your sensor!%' OR
  title_template LIKE '%⚠️ Sensor expiring soon!%' OR
  message_template LIKE '%Order your replacement now%'
);

-- Delete old sensor_expired templates that don't match our current format
DELETE FROM notification_templates 
WHERE type = 'sensor_expired' 
AND (
  title_template LIKE '%Sensor has expired%' OR
  title_template LIKE '%� Yiour health depends%' -- This one has a typo
);

-- Update any remaining templates to use consistent, direct messaging
UPDATE notification_templates 
SET 
  message_template = REPLACE(
    REPLACE(message_template, 'Consider ordering a replacement if you haven''t already', 'Make sure you have a replacement ready'),
    'Order your replacement now', 'Make sure you have a replacement ready'
  ),
  updated_at = NOW()
WHERE type IN ('sensor_expiry_warning', 'sensor_expired');

-- Ensure we have the correct templates (insert if they don't exist after cleanup)
INSERT INTO notification_templates (
  type,
  name,
  title_template,
  message_template,
  is_active,
  ab_test_group,
  ab_test_weight,
  created_at,
  updated_at
) 
SELECT * FROM (
  VALUES 
    (
      'sensor_expiry_warning',
      'Sensor Expiry Warning (Default)',
      '📅 Sensor expires soon',
      'Your {{sensorModel}} sensor will expire on {{expirationDate}}. Make sure you have a replacement ready to ensure continuous glucose monitoring.',
      true,
      'default',
      70,
      NOW(),
      NOW()
    ),
    (
      'sensor_expiry_warning',
      'Sensor Expiry Warning (Urgent)',
      '⚠️ Sensor replacement needed soon',
      'Important: Your {{sensorModel}} expires soon ({{expirationDate}}). Make sure you have a replacement ready to avoid gaps in monitoring.',
      true,
      'urgent',
      30,
      NOW(),
      NOW()
    ),
    (
      'sensor_expired',
      'Sensor Expired (Default)',
      '🔴 Sensor replacement overdue',
      'Your {{sensorModel}} sensor has expired. Replace it immediately to resume glucose monitoring and maintain your diabetes management.',
      true,
      'default',
      60,
      NOW(),
      NOW()
    ),
    (
      'sensor_expired',
      'Sensor Expired (Health Focus)',
      '💊 Your health depends on sensor replacement',
      'Critical: Your {{sensorModel}} has expired. Your diabetes management is at risk without continuous monitoring. Replace immediately.',
      true,
      'health',
      40,
      NOW(),
      NOW()
    ),
    (
      'sensor_grace_period',
      'Sensor Grace Period Alert',
      '⏳ Sensor has expired - {{graceTimeLeft}} remaining',
      'Your {{sensorModel}} has expired. Change your sensor as soon as possible. You are now in the 12-hour grace period with {{graceTimeLeft}} remaining.',
      true,
      'default',
      100,
      NOW(),
      NOW()
    )
) AS new_templates(type, name, title_template, message_template, is_active, ab_test_group, ab_test_weight, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates 
  WHERE notification_templates.type = new_templates.type 
  AND notification_templates.ab_test_group = new_templates.ab_test_group
  AND notification_templates.is_active = true
);

-- Add comment for documentation
COMMENT ON TABLE notification_templates IS 'Cleaned up notification templates - only contains active templates for sensor_expiry_warning, sensor_expired, welcome, and test types';