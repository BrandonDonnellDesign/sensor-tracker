-- Migration: Add sensor expiration notification templates
-- Description: Creates notification templates for different types of sensor expiration alerts

-- Insert sensor expiration notification templates
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
) VALUES 
-- Sensor Expiry Warning Templates (for 3-day, 1-day, day-of alerts)
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
  'Important: Your {{sensorModel}} expires soon ({{expirationDate}}). Order your replacement now to avoid gaps in monitoring.',
  true,
  'urgent',
  30,
  NOW(),
  NOW()
),

-- Sensor Expired Templates (for expired sensors)
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
);

-- Add comment for documentation
COMMENT ON TABLE notification_templates IS 'Stores notification templates for various alert types including sensor expiration alerts with A/B testing support';

-- Create index for faster template lookups by type
CREATE INDEX IF NOT EXISTS idx_notification_templates_type_active 
ON notification_templates (type, is_active) 
WHERE is_active = true;

-- Create index for A/B testing queries
CREATE INDEX IF NOT EXISTS idx_notification_templates_ab_test 
ON notification_templates (type, ab_test_group, ab_test_weight) 
WHERE is_active = true;