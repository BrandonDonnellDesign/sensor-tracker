-- Query to check daily activity tracking
-- Run this in Supabase SQL Editor to see if activities are being recorded

-- 1. Check if the table exists and has data
SELECT 
    COUNT(*) as total_activities,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT activity_date) as unique_dates,
    MIN(activity_date) as earliest_date,
    MAX(activity_date) as latest_date
FROM public.daily_activities;

-- 2. View recent activities (last 20)
SELECT 
    da.activity_date,
    da.activity_type,
    da.activity_count,
    da.created_at,
    u.email
FROM public.daily_activities da
LEFT JOIN auth.users u ON u.id = da.user_id
ORDER BY da.created_at DESC
LIMIT 20;

-- 3. Activity summary by type
SELECT 
    activity_type,
    COUNT(*) as occurrences,
    SUM(activity_count) as total_count,
    COUNT(DISTINCT user_id) as unique_users
FROM public.daily_activities
GROUP BY activity_type
ORDER BY total_count DESC;

-- 4. Activity by date (last 7 days)
SELECT 
    activity_date,
    activity_type,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(activity_count) as total_count
FROM public.daily_activities
WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY activity_date, activity_type
ORDER BY activity_date DESC, activity_type;

-- 5. Check for your specific user (replace with your user ID)
-- To get your user ID, run: SELECT id, email FROM auth.users WHERE email = 'your@email.com';
/*
SELECT 
    activity_date,
    activity_type,
    activity_count,
    created_at,
    updated_at
FROM public.daily_activities
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY activity_date DESC, activity_type;
*/

-- 6. Test the update_daily_activity function
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
/*
SELECT public.update_daily_activity(
    'YOUR_USER_ID_HERE'::uuid,
    'test_activity'
);

-- Then check if it was recorded:
SELECT * FROM public.daily_activities 
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid 
AND activity_type = 'test_activity'
ORDER BY created_at DESC
LIMIT 1;
*/
