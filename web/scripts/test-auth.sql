-- Test Authentication and User Setup
-- Run this to check if users and authentication are working

-- Check if we have any users
SELECT 
    'Total Users' as check_type,
    COUNT(*) as count
FROM auth.users;

-- Check profiles table
SELECT 
    'Total Profiles' as check_type,
    COUNT(*) as count
FROM public.profiles;

-- Check if profiles are linked to auth users
SELECT 
    'Linked Profiles' as check_type,
    COUNT(*) as linked_count,
    (SELECT COUNT(*) FROM auth.users) as total_users
FROM public.profiles p
JOIN auth.users u ON p.id = u.id;

-- Show recent users (without sensitive data)
SELECT 
    'Recent Users' as check_type,
    u.id,
    u.email,
    u.created_at,
    p.role,
    p.username
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- Check for admin users
SELECT 
    'Admin Users' as check_type,
    COUNT(*) as admin_count
FROM public.profiles
WHERE role = 'admin';

-- Test if RLS is working
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'glucose_readings', 'dexcom_tokens', 'dexcom_sync_log')
ORDER BY tablename;