-- Test Dexcom Sync Functionality
-- Run this to check if the sync system is working properly

-- Check if we have any Dexcom tokens
SELECT 
    'Active Dexcom Tokens' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS'
        ELSE 'FAIL - No active tokens found'
    END as status
FROM public.dexcom_tokens 
WHERE is_active = true;

-- Check token expiration status
SELECT 
    'Token Expiration Status' as check_type,
    dt.user_id,
    dt.token_expires_at,
    EXTRACT(EPOCH FROM (dt.token_expires_at - NOW())) / 3600 as hours_until_expiration,
    CASE 
        WHEN dt.token_expires_at <= NOW() THEN 'EXPIRED'
        WHEN dt.token_expires_at <= (NOW() + INTERVAL '2 hours') THEN 'EXPIRING_SOON'
        ELSE 'ACTIVE'
    END as token_status
FROM public.dexcom_tokens dt
WHERE dt.is_active = true
ORDER BY dt.token_expires_at;

-- Check recent sync logs
SELECT 
    'Recent Sync Logs' as check_type,
    operation,
    sync_type,
    status,
    message,
    created_at
FROM public.dexcom_sync_log 
ORDER BY created_at DESC 
LIMIT 10;

-- Test the helper function
SELECT 
    'Test Log Function' as check_type,
    public.log_dexcom_operation(
        NULL,
        'test',
        'system_test',
        'info',
        'Testing sync system functionality'
    ) as log_id;

-- Check if glucose readings exist
SELECT 
    'Glucose Readings Count' as check_type,
    COUNT(*) as total_readings,
    COUNT(DISTINCT user_id) as users_with_readings,
    MAX(created_at) as latest_reading
FROM public.glucose_readings;

-- Summary
SELECT 
    'System Status Summary' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.dexcom_tokens WHERE is_active = true) 
        THEN 'Ready for sync'
        ELSE 'No active tokens - user needs to connect Dexcom account'
    END as status;