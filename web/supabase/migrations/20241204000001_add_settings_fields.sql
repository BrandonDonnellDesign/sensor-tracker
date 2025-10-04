-- Add new settings fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS in_app_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS warning_days_before INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS critical_days_before INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12';

-- Update the updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();