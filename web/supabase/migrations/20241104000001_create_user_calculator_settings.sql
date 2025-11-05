-- Create user calculator settings table
CREATE TABLE IF NOT EXISTS user_calculator_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    insulin_to_carb DECIMAL(5,2) NOT NULL DEFAULT 15.0,
    correction_factor DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    target_glucose INTEGER NOT NULL DEFAULT 100,
    rapid_acting_duration DECIMAL(3,1) NOT NULL DEFAULT 4.0,
    short_acting_duration DECIMAL(3,1) NOT NULL DEFAULT 6.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_calculator_settings_user_id ON user_calculator_settings(user_id);

-- Add constraints for safety
ALTER TABLE user_calculator_settings 
ADD CONSTRAINT check_insulin_to_carb_range CHECK (insulin_to_carb >= 5.0 AND insulin_to_carb <= 50.0);

ALTER TABLE user_calculator_settings 
ADD CONSTRAINT check_correction_factor_range CHECK (correction_factor >= 20.0 AND correction_factor <= 150.0);

ALTER TABLE user_calculator_settings 
ADD CONSTRAINT check_target_glucose_range CHECK (target_glucose >= 80 AND target_glucose <= 140);

ALTER TABLE user_calculator_settings 
ADD CONSTRAINT check_rapid_duration_range CHECK (rapid_acting_duration >= 2.0 AND rapid_acting_duration <= 8.0);

ALTER TABLE user_calculator_settings 
ADD CONSTRAINT check_short_duration_range CHECK (short_acting_duration >= 4.0 AND short_acting_duration <= 12.0);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE user_calculator_settings ENABLE ROW LEVEL SECURITY;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_calculator_settings_updated_at 
    BEFORE UPDATE ON user_calculator_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();