-- Fix Auto-Refresh Functions to Handle Operation Column
-- Updates functions to work with the actual dexcom_sync_log table structure

-- Update the trigger function to include operation column
CREATE OR REPLACE FUNCTION public.trigger_dexcom_auto_refresh()
RETURNS void AS $$
DECLARE
    v_response jsonb;
BEGIN
    -- Call the Supabase Edge Function for auto-refresh
    -- This will be triggered by pg_cron
    
    -- Log the auto-refresh attempt (include operation column)
    INSERT INTO public.dexcom_sync_log (
        user_id,
        operation,
        sync_type,
        status,
        message,
        created_at
    ) VALUES (
        NULL, -- System operation
        'auto_refresh', -- Operation type
        'auto_refresh_trigger',
        'info',
        'Auto-refresh job triggered',
        NOW()
    );
    
    -- The actual refresh logic is handled by the Edge Function
    -- This function just serves as a trigger point for pg_cron
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the notification function to include operation column
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
    
    -- Log the status (include operation column)
    INSERT INTO public.dexcom_sync_log (
        user_id,
        operation,
        sync_type,
        status,
        message,
        created_at
    ) VALUES (
        NULL, -- System operation
        'monitoring', -- Operation type
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
            operation,
            sync_type,
            status,
            message,
            created_at
        ) VALUES (
            NULL, -- System operation
            'cleanup', -- Operation type
            'token_cleanup',
            'info',
            format('Marked %s expired tokens as inactive', v_expired_count),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function for logging Dexcom operations
CREATE OR REPLACE FUNCTION public.log_dexcom_operation(
    p_user_id uuid DEFAULT NULL,
    p_operation text DEFAULT 'sync',
    p_sync_type text DEFAULT 'manual',
    p_status text DEFAULT 'info',
    p_message text DEFAULT NULL,
    p_error_details jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO public.dexcom_sync_log (
        user_id,
        operation,
        sync_type,
        status,
        message,
        error_details,
        created_at
    ) VALUES (
        p_user_id,
        p_operation,
        p_sync_type,
        p_status,
        p_message,
        p_error_details,
        NOW()
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.trigger_dexcom_auto_refresh() TO postgres;
GRANT EXECUTE ON FUNCTION public.notify_expiring_tokens() TO postgres;
GRANT EXECUTE ON FUNCTION public.log_dexcom_operation(uuid, text, text, text, text, jsonb) TO authenticated;

-- Update comments
COMMENT ON FUNCTION public.log_dexcom_operation(uuid, text, text, text, text, jsonb) IS 'Helper function to log Dexcom operations with proper column structure';

-- Test the functions to make sure they work
DO $$
BEGIN
    -- Test the logging function
    PERFORM public.log_dexcom_operation(
        NULL,
        'test',
        'migration_test',
        'info',
        'Testing updated function structure'
    );
    
    RAISE NOTICE 'Functions updated successfully and tested';
END $$;