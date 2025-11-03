-- Monitor Dexcom auto-refresh activity

-- Check recent auto-refresh logs
SELECT 
    created_at,
    sync_type,
    status,
    message,
    CASE 
        WHEN user_id IS NULL THEN 'SYSTEM'
        ELSE 'USER: ' || user_id::text
    END as operation_type
FROM public.dexcom_sync_log 
WHERE sync_type IN (
    'auto_refresh_trigger',
    'token_status_check', 
    'token_cleanup',
    'daily_summary',
    'manual_token_refresh',
    'auto_token_refresh'
)
ORDER BY created_at DESC 
LIMIT 20;

-- Check current token status for all users
SELECT 
    dt.user_id,
    p.username,
    dt.token_expires_at,
    dt.last_sync_at,
    dts.hours_until_expiration,
    dts.status,
    dts.needs_attention
FROM public.dexcom_tokens dt
JOIN public.profiles p ON dt.user_id = p.id
JOIN public.dexcom_token_status dts ON dt.id = dts.id
WHERE dt.is_active = true
ORDER BY dts.hours_until_expiration ASC;

-- Check tokens that need refresh (within 24 hours)
SELECT * FROM public.get_expiring_dexcom_tokens(24);

-- Check tokens that need immediate refresh (within 2 hours)
SELECT * FROM public.get_expiring_dexcom_tokens(2);

-- Check if pg_cron jobs are scheduled (requires superuser)
-- SELECT * FROM cron.job WHERE jobname LIKE 'dexcom%';

-- Count auto-refresh activities by day (last 7 days)
SELECT 
    DATE(created_at) as date,
    sync_type,
    status,
    COUNT(*) as count
FROM public.dexcom_sync_log 
WHERE created_at >= NOW() - INTERVAL '7 days'
AND sync_type IN ('auto_refresh_trigger', 'token_status_check', 'token_cleanup')
GROUP BY DATE(created_at), sync_type, status
ORDER BY date DESC, sync_type;

-- Check system operations (NULL user_id)
SELECT 
    COUNT(*) as system_operations_count,
    MAX(created_at) as last_system_operation
FROM public.dexcom_sync_log 
WHERE user_id IS NULL;