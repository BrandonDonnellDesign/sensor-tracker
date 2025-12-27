-- Re-enable RLS on daily_activities now that streak is fixed
-- This restores proper security

-- Re-enable RLS
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- Ensure policies are in place (they should already exist from previous migration)
-- But let's make sure they're correct

-- Drop and recreate policies to be sure
DROP POLICY IF EXISTS "Users can view their own activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON daily_activities;

-- Create proper RLS policies
CREATE POLICY "Users can view their own activities" ON daily_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON daily_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON daily_activities
    FOR UPDATE USING (auth.uid() = user_id);

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE ON daily_activities TO authenticated;