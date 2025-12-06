-- Fix calculator settings RLS policies that already exist
-- Drop and recreate to avoid duplicate errors

DROP POLICY IF EXISTS "Users can view own calculator settings" ON user_calculator_settings;
CREATE POLICY "Users can view own calculator settings" ON user_calculator_settings
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own calculator settings" ON user_calculator_settings;
CREATE POLICY "Users can insert own calculator settings" ON user_calculator_settings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own calculator settings" ON user_calculator_settings;
CREATE POLICY "Users can update own calculator settings" ON user_calculator_settings
    FOR UPDATE USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own calculator settings" ON user_calculator_settings;
CREATE POLICY "Users can delete own calculator settings" ON user_calculator_settings
    FOR DELETE USING (auth.uid()::text = user_id);
