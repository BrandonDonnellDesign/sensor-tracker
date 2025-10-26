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
    
    -- Insert or update daily activity
    INSERT INTO public.daily_activities (user_id, activity_date, activity_type, count)
    VALUES (p_user_id, v_today, p_activity, 1)
    ON CONFLICT (user_id, activity_date, activity_type)
    DO UPDATE SET 
        count = public.daily_activities.count + 1,
        updated_at = NOW();
        
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail
        RAISE WARNING 'Error updating daily activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_daily_activity(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_activity(uuid, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.update_daily_activity(uuid, text) IS 'Updates daily activity count for a user';
