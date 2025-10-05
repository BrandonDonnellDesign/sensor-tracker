-- Add new settings fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS in_app_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS warning_days_before INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS critical_days_before INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12';