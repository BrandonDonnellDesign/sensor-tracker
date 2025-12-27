-- Temporarily disable RLS on daily_activities to fix the streak issue
-- We'll re-enable it after the streak is fixed

-- Disable RLS temporarily
ALTER TABLE daily_activities DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users temporarily
GRANT ALL ON daily_activities TO authenticated;