-- Add RLS policies for user_calculator_settings table
-- This fixes the "new row violates row-level security policy" error

-- Enable RLS on the table
ALTER TABLE user_calculator_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own calculator settings
CREATE POLICY "Users can view own calculator settings" ON user_calculator_settings
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own calculator settings
CREATE POLICY "Users can insert own calculator settings" ON user_calculator_settings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own calculator settings
CREATE POLICY "Users can update own calculator settings" ON user_calculator_settings
    FOR UPDATE USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can delete their own calculator settings
CREATE POLICY "Users can delete own calculator settings" ON user_calculator_settings
    FOR DELETE USING (auth.uid()::text = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_calculator_settings TO authenticated;