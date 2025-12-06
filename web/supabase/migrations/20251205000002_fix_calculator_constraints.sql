-- Fix calculator settings constraints and trigger
-- Add constraints only if they don't exist

DO $$ 
BEGIN
    -- Add constraints only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_insulin_to_carb_range'
    ) THEN
        ALTER TABLE user_calculator_settings 
        ADD CONSTRAINT check_insulin_to_carb_range CHECK (insulin_to_carb >= 5.0 AND insulin_to_carb <= 50.0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_correction_factor_range'
    ) THEN
        ALTER TABLE user_calculator_settings 
        ADD CONSTRAINT check_correction_factor_range CHECK (correction_factor >= 20.0 AND correction_factor <= 150.0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_target_glucose_range'
    ) THEN
        ALTER TABLE user_calculator_settings 
        ADD CONSTRAINT check_target_glucose_range CHECK (target_glucose >= 80 AND target_glucose <= 140);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_rapid_duration_range'
    ) THEN
        ALTER TABLE user_calculator_settings 
        ADD CONSTRAINT check_rapid_duration_range CHECK (rapid_acting_duration >= 2.0 AND rapid_acting_duration <= 8.0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_short_duration_range'
    ) THEN
        ALTER TABLE user_calculator_settings 
        ADD CONSTRAINT check_short_duration_range CHECK (short_acting_duration >= 4.0 AND short_acting_duration <= 12.0);
    END IF;
END $$;

-- Recreate trigger to avoid duplicate error
DROP TRIGGER IF EXISTS update_user_calculator_settings_updated_at ON user_calculator_settings;
CREATE TRIGGER update_user_calculator_settings_updated_at 
    BEFORE UPDATE ON user_calculator_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
