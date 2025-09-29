-- Add sensor type support to the database

-- Create sensor_type enum
CREATE TYPE sensor_type AS ENUM ('dexcom', 'freestyle');

-- Add sensor_type column to sensors table
ALTER TABLE public.sensors 
ADD COLUMN sensor_type sensor_type NOT NULL DEFAULT 'dexcom';

-- Make lot_number optional (nullable)
ALTER TABLE public.sensors 
ALTER COLUMN lot_number DROP NOT NULL;

-- Add constraint to ensure lot_number is required for Dexcom sensors only
ALTER TABLE public.sensors 
ADD CONSTRAINT check_lot_number_for_dexcom 
CHECK (
  (sensor_type = 'dexcom' AND lot_number IS NOT NULL) OR 
  (sensor_type = 'freestyle' AND lot_number IS NULL)
);

-- Add index for sensor_type for better query performance
CREATE INDEX idx_sensors_sensor_type ON public.sensors(sensor_type);

-- Update existing sensors to have dexcom type (since they all have lot_number)
UPDATE public.sensors SET sensor_type = 'dexcom' WHERE lot_number IS NOT NULL;