-- Create sensor models table to manage different sensor types and their durations

-- Create sensor_models table
CREATE TABLE public.sensor_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL, -- e.g., 'Dexcom', 'Abbott', 'Medtronic'
  model_name TEXT NOT NULL, -- e.g., 'G6', 'G7', 'Libre 2', 'Libre 3'
  duration_days INTEGER NOT NULL, -- How many days the sensor lasts
  is_active BOOLEAN DEFAULT TRUE NOT NULL, -- Can disable old/unavailable models
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure unique combination of manufacturer and model
  UNIQUE(manufacturer, model_name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sensor_models ENABLE ROW LEVEL SECURITY;

-- Create policies (allow read access for authenticated users)
CREATE POLICY "Sensor models are viewable by authenticated users"
ON public.sensor_models
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Create index for better query performance
CREATE INDEX idx_sensor_models_manufacturer ON public.sensor_models(manufacturer);
CREATE INDEX idx_sensor_models_active ON public.sensor_models(is_active);

-- Insert common sensor models
INSERT INTO public.sensor_models (manufacturer, model_name, duration_days) VALUES
  ('Dexcom', 'G6', 10),
  ('Dexcom', 'G7', 10),
  ('Abbott', 'FreeStyle Libre', 14),
  ('Abbott', 'FreeStyle Libre 2', 14),
  ('Abbott', 'FreeStyle Libre 3', 14),
  ('Medtronic', 'Guardian Connect', 7),
  ('Medtronic', 'Guardian 4', 7);

-- Update sensors table to reference sensor model instead of sensor_type
-- First, add the foreign key column
ALTER TABLE public.sensors
ADD COLUMN sensor_model_id UUID REFERENCES public.sensor_models(id);

-- Create index for the foreign key
CREATE INDEX idx_sensors_sensor_model_id ON public.sensors(sensor_model_id);

-- For existing sensors, map them to appropriate models
-- This is a migration, so we need to be careful about existing data
UPDATE public.sensors
SET sensor_model_id = (
  SELECT id FROM public.sensor_models
  WHERE manufacturer = 'Dexcom' AND model_name = 'G6'
  LIMIT 1
)
WHERE sensor_type = 'dexcom';

UPDATE public.sensors
SET sensor_model_id = (
  SELECT id FROM public.sensor_models
  WHERE manufacturer = 'Abbott' AND model_name = 'FreeStyle Libre'
  LIMIT 1
)
WHERE sensor_type = 'freestyle';

-- Make sensor_model_id NOT NULL after migration
ALTER TABLE public.sensors
ALTER COLUMN sensor_model_id SET NOT NULL;

-- Now we can drop the old sensor_type column
ALTER TABLE public.sensors
DROP COLUMN sensor_type;

-- Update RLS policies to work with sensor_model_id
-- (Existing policies should still work since we're maintaining the same access patterns)