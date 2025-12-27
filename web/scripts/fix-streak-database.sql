-- Fix streak database to give credit for all 75 days from Oct 14, 2025 to Dec 27, 2025
-- Run this script in your Supabase SQL editor

-- First, let's see your current user ID (replace with your actual user ID)
-- You can find this by running: SELECT auth.uid();

-- Clear existing login activities for your user
DELETE FROM daily_activities 
WHERE user_id = auth.uid() 
AND activity_type = 'login';

-- Insert daily login activities from Oct 14, 2025 to Dec 27, 2025
WITH date_series AS (
  SELECT generate_series(
    '2025-10-14'::date,
    '2025-12-27'::date,
    '1 day'::interval
  )::date as activity_date
)
INSERT INTO daily_activities (user_id, activity_type, activity_date, points_earned, activity_count, activities)
SELECT 
  auth.uid(),
  'login',
  activity_date,
  5,
  1,
  '[]'::jsonb
FROM date_series;

-- Update user gamification stats with correct streak
UPDATE user_gamification_stats 
SET 
  current_streak = 75,
  longest_streak = GREATEST(longest_streak, 75),
  last_activity_date = '2025-12-27',
  total_points = total_points + (75 * 5), -- Add points for 75 days of login
  updated_at = NOW()
WHERE user_id = auth.uid();

-- Verify the results
SELECT 
  'Current streak: ' || current_streak || ' days' as streak_info,
  'Total points: ' || total_points as points_info,
  'Last activity: ' || last_activity_date as last_activity
FROM user_gamification_stats 
WHERE user_id = auth.uid();

-- Count activities to verify
SELECT 
  'Total login activities: ' || COUNT(*) as activity_count,
  'Date range: ' || MIN(activity_date) || ' to ' || MAX(activity_date) as date_range
FROM daily_activities 
WHERE user_id = auth.uid() 
AND activity_type = 'login';