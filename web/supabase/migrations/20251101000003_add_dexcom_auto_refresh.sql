-- Add automatic Dexcom token refresh functionality
-- Note: Requires migration 20251101000004_fix_dexcom_sync_log_table.sql to be applied first

-- Create a function to call the auto-refresh edge function
CREATE OR REPLACE FUNCTION public.trigger_dexcom_auto_refresh()
RETURNS void AS $$
DECLARE
    v_response jsonb;
BEGIN
    -- Call the Supabase Edge Function for auto-refresh
    -- This will be triggered by pg_cron
    
    -- Log the auto-refresh attempt
    INSERT INTO public.dexcom_sync_log (
        user_id,
        sync_type,
        status,
        message,
        created_at
    ) VALUES (
        NULL, -- System operation
        'auto_refresh_trigger',
        'info',
        'Auto-refresh job triggered',
        NOW()
    );
    
    -- The actual refresh logic is handled by the Edge Function
    -- This function just serves as a trigger point for pg_cron
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_dexcom_auto_refresh() TO postgres;

-- Add indexes for better performance on token expiration queries
CREATE INDEX IF NOT EXISTS idx_dexcom_tokens_expiring 
ON public.dexcom_tokens (token_expires_at, is_active) 
WHERE is_active = true;

-- Drop existing function and recreate with new parameter
DROP FUNCTION IF EXISTS public.get_expiring_dexcom_tokens(integer);

-- Add a function to get tokens that need refresh
CREATE OR REPLACE FUNCTION public.get_expiring_dexcom_tokens(minutes_ahead integer DEFAULT 90)
RETURNS TABLE (
    token_id uuid,
    user_id uuid,
    expires_at timestamp with time zone,
    hours_until_expiration numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.id as token_id,
        dt.user_id,
        dt.token_expires_at as expires_at,
        EXTRACT(EPOCH FROM (dt.token_expires_at - NOW())) / 3600 as hours_until_expiration
    FROM public.dexcom_tokens dt
    WHERE dt.is_active = true
    AND dt.token_expires_at > NOW() -- Not already expired
    AND dt.token_expires_at <= (NOW() + INTERVAL '1 minute' * minutes_ahead) -- Expires within specified minutes
    ORDER BY dt.token_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_expiring_dexcom_tokens(integer) TO authenticated;

-- Add a function to check if a user's token needs refresh
CREATE OR REPLACE FUNCTION public.user_token_needs_refresh(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
    v_expires_at timestamp with time zone;
    v_hours_until_expiration numeric;
BEGIN
    -- Get the user's active token expiration
    SELECT token_expires_at INTO v_expires_at
    FROM public.dexcom_tokens
    WHERE user_id = p_user_id
    AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no token found, return false
    IF v_expires_at IS NULL THEN
        RETURN false;
    END IF;
    
    -- Calculate minutes until expiration
    v_hours_until_expiration := EXTRACT(EPOCH FROM (v_expires_at - NOW())) / 3600;
    
    -- Return true if token expires within 1.5 hours but hasn't expired yet
    RETURN (v_hours_until_expiration <= 1.5 AND v_hours_until_expiration > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_token_needs_refresh(uuid) TO authenticated;

-- Create a view for token status monitoring
CREATE OR REPLACE VIEW public.dexcom_token_status AS
SELECT 
    dt.id,
    dt.user_id,
    dt.token_expires_at,
    dt.is_active,
    dt.last_sync_at,
    dt.created_at,
    dt.updated_at,
    EXTRACT(EPOCH FROM (dt.token_expires_at - NOW())) / 3600 as hours_until_expiration,
    CASE 
        WHEN dt.token_expires_at <= NOW() THEN 'expired'
        WHEN dt.token_expires_at <= (NOW() + INTERVAL '30 minutes') THEN 'expiring'
        WHEN dt.token_expires_at <= (NOW() + INTERVAL '90 minutes') THEN 'refresh_soon'
        ELSE 'active'
    END as status,
    CASE 
        WHEN dt.token_expires_at <= NOW() THEN true
        WHEN dt.token_expires_at <= (NOW() + INTERVAL '90 minutes') THEN true
        ELSE false
    END as needs_attention
FROM public.dexcom_tokens dt
WHERE dt.is_active = true;

-- Grant select permission on the view
GRANT SELECT ON public.dexcom_token_status TO authenticated;

-- Add RLS policy for the view
ALTER VIEW public.dexcom_token_status SET (security_invoker = true);

-- Create a notification function for expiring tokens
CREATE OR REPLACE FUNCTION public.notify_expiring_tokens()
RETURNS void AS $$
DECLARE
    v_expiring_count integer;
    v_expired_count integer;
BEGIN
    -- Count expiring tokens (within 90 minutes)
    SELECT COUNT(*) INTO v_expiring_count
    FROM public.dexcom_tokens
    WHERE is_active = true
    AND token_expires_at > NOW()
    AND token_expires_at <= (NOW() + INTERVAL '90 minutes');
    
    -- Count expired tokens
    SELECT COUNT(*) INTO v_expired_count
    FROM public.dexcom_tokens
    WHERE is_active = true
    AND token_expires_at <= NOW();
    
    -- Log the status
    INSERT INTO public.dexcom_sync_log (
        user_id,
        sync_type,
        status,
        message,
        created_at
    ) VALUES (
        NULL, -- System operation
        'token_status_check',
        'info',
        format('Token status: %s expiring, %s expired', v_expiring_count, v_expired_count),
        NOW()
    );
    
    -- If there are expired tokens, mark them as inactive
    IF v_expired_count > 0 THEN
        UPDATE public.dexcom_tokens
        SET is_active = false,
            updated_at = NOW()
        WHERE is_active = true
        AND token_expires_at <= NOW();
        
        INSERT INTO public.dexcom_sync_log (
            user_id,
            sync_type,
            status,
            message,
            created_at
        ) VALUES (
            NULL, -- System operation
            'token_cleanup',
            'info',
            format('Marked %s expired tokens as inactive', v_expired_count),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.notify_expiring_tokens() TO postgres;

-- Add comments for documentation
COMMENT ON FUNCTION public.trigger_dexcom_auto_refresh() IS 'Triggers the automatic Dexcom token refresh process';
COMMENT ON FUNCTION public.get_expiring_dexcom_tokens(integer) IS 'Returns tokens that expire within the specified number of hours';
COMMENT ON FUNCTION public.user_token_needs_refresh(uuid) IS 'Checks if a specific user''s token needs refresh';
COMMENT ON VIEW public.dexcom_token_status IS 'Provides real-time status of Dexcom tokens including expiration info';
COMMENT ON FUNCTION public.notify_expiring_tokens() IS 'Monitors and cleans up expired tokens, sends notifications';