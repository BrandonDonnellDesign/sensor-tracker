-- Create medication tracking tables
-- This migration creates comprehensive medication tracking for diabetes management

-- Medication types and definitions
CREATE TABLE medication_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'insulin', 'oral_medication', 'other'
  description TEXT,
  common_units TEXT[], -- ['units', 'mg', 'ml', 'tablets']
  default_unit TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's personal medications
CREATE TABLE user_medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_type_id UUID REFERENCES medication_types(id),
  custom_name TEXT, -- For custom medications not in the types table
  brand_name TEXT,
  strength TEXT, -- e.g., "100 units/ml", "500mg"
  dosage_form TEXT, -- 'injection', 'tablet', 'liquid', etc.
  prescriber TEXT,
  pharmacy TEXT,
  prescription_number TEXT,
  refill_date DATE,
  expiry_date DATE,
  storage_instructions TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either medication_type_id or custom_name is provided
  CONSTRAINT check_medication_name CHECK (
    (medication_type_id IS NOT NULL) OR (custom_name IS NOT NULL)
  )
);

-- Medication dosing schedules/reminders
CREATE TABLE medication_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_medication_id UUID NOT NULL REFERENCES user_medications(id) ON DELETE CASCADE,
  schedule_name TEXT NOT NULL, -- 'Morning Lantus', 'Mealtime Humalog', etc.
  dosage_amount DECIMAL(10,2) NOT NULL,
  dosage_unit TEXT NOT NULL,
  frequency TEXT NOT NULL, -- 'daily', 'twice_daily', 'with_meals', 'as_needed'
  time_of_day TIME[], -- Array of times for scheduled doses
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc. NULL = all days
  meal_timing TEXT, -- 'before_meal', 'with_meal', 'after_meal', 'bedtime', null
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actual medication logs (when medications are taken)
CREATE TABLE medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_medication_id UUID NOT NULL REFERENCES user_medications(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES medication_schedules(id), -- NULL for unscheduled doses
  
  -- Dosage information
  dosage_amount DECIMAL(10,2) NOT NULL,
  dosage_unit TEXT NOT NULL,
  
  -- Timing
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  scheduled_time TIMESTAMP WITH TIME ZONE, -- When it was supposed to be taken
  
  -- Context
  meal_relation TEXT, -- 'before_meal', 'with_meal', 'after_meal', 'between_meals'
  injection_site TEXT, -- For insulin: 'arm', 'thigh', 'abdomen', 'buttocks'
  blood_glucose_before DECIMAL(5,1), -- BG reading before medication
  blood_glucose_after DECIMAL(5,1), -- BG reading after medication (if applicable)
  
  -- Additional info
  notes TEXT,
  mood TEXT, -- 'good', 'stressed', 'sick', etc.
  activity_level TEXT, -- 'sedentary', 'light', 'moderate', 'intense'
  
  -- Metadata
  logged_via TEXT DEFAULT 'manual', -- 'manual', 'reminder', 'auto'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medication reminders/notifications
CREATE TABLE medication_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'acknowledged', 'taken', 'skipped', 'snoozed'
  snoozed_until TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common medication types
INSERT INTO medication_types (name, category, description, common_units, default_unit) VALUES
-- Insulin types
('Rapid-Acting Insulin', 'insulin', 'Fast-acting insulin for meals (Humalog, NovoLog, Apidra)', ARRAY['units'], 'units'),
('Short-Acting Insulin', 'insulin', 'Regular insulin (Humulin R, Novolin R)', ARRAY['units'], 'units'),
('Intermediate-Acting Insulin', 'insulin', 'NPH insulin (Humulin N, Novolin N)', ARRAY['units'], 'units'),
('Long-Acting Insulin', 'insulin', 'Basal insulin (Lantus, Levemir, Tresiba)', ARRAY['units'], 'units'),
('Ultra-Long-Acting Insulin', 'insulin', 'Extended basal insulin (Toujeo, Degludec)', ARRAY['units'], 'units'),
('Premixed Insulin', 'insulin', 'Combination insulin (70/30, 75/25)', ARRAY['units'], 'units'),

-- Oral medications
('Metformin', 'oral_medication', 'First-line diabetes medication', ARRAY['mg', 'tablets'], 'mg'),
('Glipizide', 'oral_medication', 'Sulfonylurea medication', ARRAY['mg', 'tablets'], 'mg'),
('Glyburide', 'oral_medication', 'Sulfonylurea medication', ARRAY['mg', 'tablets'], 'mg'),
('Sitagliptin', 'oral_medication', 'DPP-4 inhibitor (Januvia)', ARRAY['mg', 'tablets'], 'mg'),
('Empagliflozin', 'oral_medication', 'SGLT2 inhibitor (Jardiance)', ARRAY['mg', 'tablets'], 'mg'),
('Pioglitazone', 'oral_medication', 'Thiazolidinedione (Actos)', ARRAY['mg', 'tablets'], 'mg'),

-- Other diabetes medications
('Glucagon', 'other', 'Emergency glucose treatment', ARRAY['mg', 'units'], 'mg'),
('Semaglutide', 'other', 'GLP-1 agonist injection (Ozempic)', ARRAY['mg', 'units'], 'mg'),
('Liraglutide', 'other', 'GLP-1 agonist injection (Victoza)', ARRAY['mg', 'units'], 'mg');

-- Create indexes for better performance
CREATE INDEX idx_user_medications_user_id ON user_medications(user_id);
CREATE INDEX idx_user_medications_active ON user_medications(user_id, is_active);
CREATE INDEX idx_medication_schedules_user_id ON medication_schedules(user_id);
CREATE INDEX idx_medication_schedules_active ON medication_schedules(user_id, is_active);
CREATE INDEX idx_medication_logs_user_id ON medication_logs(user_id);
CREATE INDEX idx_medication_logs_taken_at ON medication_logs(user_id, taken_at DESC);
CREATE INDEX idx_medication_logs_medication ON medication_logs(user_medication_id, taken_at DESC);
CREATE INDEX idx_medication_reminders_user_id ON medication_reminders(user_id);
CREATE INDEX idx_medication_reminders_time ON medication_reminders(user_id, reminder_time);
CREATE INDEX idx_medication_reminders_status ON medication_reminders(user_id, status, reminder_time);

-- Enable RLS (Row Level Security)
ALTER TABLE medication_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- medication_types: Read-only for all authenticated users
CREATE POLICY "medication_types_read" ON medication_types
  FOR SELECT TO authenticated USING (true);

-- user_medications: Users can only access their own medications
CREATE POLICY "user_medications_policy" ON user_medications
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- medication_schedules: Users can only access their own schedules
CREATE POLICY "medication_schedules_policy" ON medication_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- medication_logs: Users can only access their own logs
CREATE POLICY "medication_logs_policy" ON medication_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- medication_reminders: Users can only access their own reminders
CREATE POLICY "medication_reminders_policy" ON medication_reminders
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_medication_types_updated_at BEFORE UPDATE ON medication_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_medications_updated_at BEFORE UPDATE ON user_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_schedules_updated_at BEFORE UPDATE ON medication_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_logs_updated_at BEFORE UPDATE ON medication_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_reminders_updated_at BEFORE UPDATE ON medication_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();