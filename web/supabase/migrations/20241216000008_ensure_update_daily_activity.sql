-- Ensure update_daily_activity function exists with correct signature
-- This function is called from the gamification provider

-- Drop existing versions if any
DROP FUNCTION IF EXISTS public.update_daily_activity(uuid, text) CASCADE;

-- Create the function with proper search_path
CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_user_id uuid,
    p_activity text
)
RETURNS void AS $$
DECLARE
    v_today date;
BEGIN
    v_today := CURRENT_DATE;
    
    -- Insert or update daily activity (using correct column name: activity_count)
    INSERT INTO public.daily_activities (user_id, activity_date, activity_type, activity_count)
    VALUES (p_user_id, v_today, p_activity, 1)
    ON CONFLICT (user_id, activity_date, activity_type)
    DO UPDATE SET 
        activity_count = public.daily_activities.activity_count + 1,
        updated_at = NOW();
    
    -- Log success for debugging
    RAISE NOTICE 'Successfully updated daily activity: user=%, activity=%, date=%', p_user_id, p_activity, v_today;
        
EXCEPTION
    WHEN OTHERS THEN
        -- Log detailed error
        RAISE WARNING 'Error updating daily activity for user % activity %: % (SQLSTATE: %)', 
            p_user_id, p_activity, SQLERRM, SQLSTATE;
        -- Re-raise to make error visible in client
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_daily_activity(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_activity(uuid, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.update_daily_activity(uuid, text) IS 'Updates daily activity count for a user';
