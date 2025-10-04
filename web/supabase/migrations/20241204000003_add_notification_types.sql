-- Add sensor_critical type to notifications table
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('sensor_expiring', 'sensor_expired', 'sensor_critical', 'sensor_issue', 'maintenance_reminder'));