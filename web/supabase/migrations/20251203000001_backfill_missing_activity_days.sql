-- Backfill missing activity days to maintain streak continuity
-- This fills in Oct 5 and Oct 6, 2025 for the user

-- Check if records already exist before inserting
DO $$
BEGIN
    -- Insert Oct 5, 2025 if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_activities 
        WHERE user_id = '501debf3-24e5-4232-821e-3195ba408692' 
        AND activity_date = '2025-10-05'
    ) THEN
        INSERT INTO public.daily_activities (
            user_id,
            activity_date,
            activity_type,
            activity_count,
            points_earned,
            activities,
            created_at,
            updated_at
        ) VALUES (
            '501debf3-24e5-4232-821e-3195ba408692',
            '2025-10-05',
            'login',
            1,
            10,
            '[]',
            '2025-10-05 12:00:00+00',
            '2025-10-05 12:00:00+00'
        );
    END IF;
    
    -- Insert Oct 6, 2025 if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_activities 
        WHERE user_id = '501debf3-24e5-4232-821e-3195ba408692' 
        AND activity_date = '2025-10-06'
    ) THEN
        INSERT INTO public.daily_activities (
            user_id,
            activity_date,
            activity_type,
            activity_count,
            points_earned,
            activities,
            created_at,
            updated_at
        ) VALUES (
            '501debf3-24e5-4232-821e-3195ba408692',
            '2025-10-06',
            'login',
            1,
            10,
            '[]',
            '2025-10-06 12:00:00+00',
            '2025-10-06 12:00:00+00'
        );
    END IF;
END $$;

-- Recalculate streak for this user
DO $$
DECLARE
    calculated_streak integer;
BEGIN
    calculated_streak := public.calculate_user_streak('501debf3-24e5-4232-821e-3195ba408692');
    
    UPDATE public.user_gamification_stats
    SET 
        current_streak = calculated_streak,
        longest_streak = GREATEST(longest_streak, calculated_streak),
        updated_at = NOW()
    WHERE user_id = '501debf3-24e5-4232-821e-3195ba408692';
    
    RAISE NOTICE 'Updated streak to % days', calculated_streak;
END $$;
