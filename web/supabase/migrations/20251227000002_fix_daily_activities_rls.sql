-- Fix RLS policies for daily_activities table
-- This ensures users can insert their own activities

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON daily_activities;

-- Create new, more permissive policies
CREATE POLICY "Users can view their own activities" ON daily_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON daily_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON daily_activities
    FOR UPDATE USING (auth.uid() = user_id);

-- Also ensure the table has RLS enabled
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON daily_activities TO authenticated;