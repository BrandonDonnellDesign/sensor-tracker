-- Create dedicated insulin logs table
-- This replaces the complex medication system for insulin tracking

CREATE TABLE insulin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Insulin details
  insulin_type TEXT NOT NULL, -- 'rapid', 'short', 'intermediate', 'long', 'ultra_long', 'premixed'
  insulin_name TEXT, -- Brand name like 'Humalog', 'Lantus', etc.
  
  -- Dosage
  units DECIMAL(6,2) NOT NULL CHECK (units > 0),
  
  -- Timing
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Classification
  delivery_type TEXT NOT NULL DEFAULT 'bolus', -- 'bolus', 'basal', 'correction', 'meal'
  meal_relation TEXT, -- 'before_meal', 'with_meal', 'after_meal', 'bedtime', 'correction'
  
  -- Context
  injection_site TEXT, -- 'arm', 'thigh', 'abdomen', 'buttocks', 'omnipod'
  blood_glucose_before DECIMAL(5,1), -- BG reading before insulin
  blood_glucose_after DECIMAL(5,1), -- BG reading after insulin
  
  -- Additional info
  notes TEXT,
  mood TEXT, -- 'good', 'stressed', 'sick', etc.
  activity_level TEXT, -- 'sedentary', 'light', 'moderate', 'intense'
  
  -- Metadata
  logged_via TEXT DEFAULT 'manual', -- 'manual', 'csv_import', 'quick_bolus', 'pump_sync'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_insulin_logs_user_id ON insulin_logs(user_id);
CREATE INDEX idx_insulin_logs_taken_at ON insulin_logs(user_id, taken_at DESC);
CREATE INDEX idx_insulin_logs_delivery_type ON insulin_logs(user_id, delivery_type, taken_at DESC);
CREATE INDEX idx_insulin_logs_insulin_type ON insulin_logs(user_id, insulin_type, taken_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE insulin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own insulin logs
CREATE POLICY "insulin_logs_policy" ON insulin_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_insulin_logs_updated_at BEFORE UPDATE ON insulin_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional - remove in production)
-- This helps verify the structure works correctly
INSERT INTO insulin_logs (
  user_id, 
  insulin_type, 
  insulin_name, 
  units, 
  delivery_type, 
  meal_relation, 
  injection_site, 
  notes,
  logged_via
) VALUES 
-- Only insert if there are users (this will fail gracefully if no users exist)
(
  (SELECT id FROM auth.users LIMIT 1),
  'rapid',
  'Humalog',
  8.5,
  'bolus',
  'before_meal',
  'abdomen',
  'Breakfast bolus',
  'manual'
) ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE insulin_logs IS 'Dedicated table for tracking insulin doses and related information';
COMMENT ON COLUMN insulin_logs.insulin_type IS 'Standardized insulin type: rapid, short, intermediate, long, ultra_long, premixed';
COMMENT ON COLUMN insulin_logs.delivery_type IS 'How the insulin was delivered: bolus, basal, correction, meal';
COMMENT ON COLUMN insulin_logs.meal_relation IS 'Relationship to meals: before_meal, with_meal, after_meal, bedtime, correction';
COMMENT ON COLUMN insulin_logs.injection_site IS 'Body location or device: arm, thigh, abdomen, buttocks, omnipod';
COMMENT ON COLUMN insulin_logs.logged_via IS 'How the entry was created: manual, csv_import, quick_bolus, pump_sync';