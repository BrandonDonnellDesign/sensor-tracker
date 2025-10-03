-- Change date_added from DATE to TIMESTAMP WITH TIME ZONE to include time information

-- Alter the date_added column to include time
ALTER TABLE public.sensors
ALTER COLUMN date_added TYPE TIMESTAMP WITH TIME ZONE USING date_added::TIMESTAMP WITH TIME ZONE;

-- Update the default to include current timestamp instead of current date
ALTER TABLE public.sensors
ALTER COLUMN date_added SET DEFAULT NOW();