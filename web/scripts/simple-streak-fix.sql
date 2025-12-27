-- Simple step-by-step streak fix
-- Run each section separately in your Supabase SQL Editor

-- STEP 1: Get your user ID
SELECT auth.uid() as your_user_id;

-- STEP 2: Copy the user ID from step 1 and use it in the queries below
-- Replace 'PASTE_YOUR_USER_ID_HERE' with the actual UUID

-- STEP 3: Clear existing login activities
DELETE FROM daily_activities 
WHERE user_id = 'PASTE_YOUR_USER_ID_HERE'
AND activity_type = 'login';

-- STEP 4: Insert activities for Oct 14 - Dec 27 (75 days)
INSERT INTO daily_activities (user_id, activity_type, activity_date, points_earned, activity_count, activities)
VALUES 
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-14', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-15', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-16', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-17', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-18', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-19', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-20', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-21', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-22', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-23', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-24', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-25', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-26', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-27', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-28', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-29', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-30', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-10-31', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-01', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-02', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-03', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-04', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-05', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-06', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-07', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-08', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-09', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-10', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-11', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-12', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-13', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-14', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-15', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-16', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-17', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-18', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-19', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-20', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-21', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-22', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-23', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-24', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-25', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-26', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-27', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-28', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-29', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-11-30', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-01', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-02', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-03', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-04', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-05', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-06', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-07', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-08', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-09', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-10', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-11', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-12', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-13', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-14', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-15', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-16', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-17', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-18', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-19', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-20', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-21', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-22', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-23', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-24', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-25', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-26', 5, 1, '[]'),
('PASTE_YOUR_USER_ID_HERE', 'login', '2025-12-27', 5, 1, '[]');

-- STEP 5: Update the streak in user stats
UPDATE user_gamification_stats 
SET 
    current_streak = 75,
    longest_streak = GREATEST(longest_streak, 75),
    last_activity_date = '2025-12-27',
    total_points = total_points + 375, -- Add 375 points (75 days × 5 points)
    updated_at = NOW()
WHERE user_id = 'PASTE_YOUR_USER_ID_HERE';

-- STEP 6: Verify the results
SELECT 
    current_streak,
    longest_streak,
    last_activity_date,
    total_points
FROM user_gamification_stats 
WHERE user_id = 'PASTE_YOUR_USER_ID_HERE';

-- STEP 7: Count activities to verify
SELECT 
    COUNT(*) as total_activities,
    MIN(activity_date) as first_date,
    MAX(activity_date) as last_date
FROM daily_activities 
WHERE user_id = 'PASTE_YOUR_USER_ID_HERE'
AND activity_type = 'login';