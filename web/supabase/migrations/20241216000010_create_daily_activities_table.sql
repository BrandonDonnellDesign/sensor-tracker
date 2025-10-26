-- Ensure daily_activities table has the correct structure
-- Add missing columns if they don't exist

DO $$ 
BEGIN
    -- Add activity_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_activities' 
        AND column_name = 'activity_type'
    ) THEN
        ALTER TABLE public.daily_activities 
        ADD COLUMN activity_type text NOT NULL DEFAULT 'unknown';
        
        RAISE NOTICE 'Added activity_type column to daily_activities';
    END IF;
    
    -- Rename count to activity_count if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_activities' 
        AND column_name = 'count'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_activities' 
        AND column_name = 'activity_count'
    ) THEN
        ALTER TABLE public.daily_activities 
        RENAME COLUMN count TO activity_count;
        
        RAISE NOTICE 'Renamed count to activity_count in daily_activities';
    END IF;
    
    -- Add activity_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_activities' 
        AND column_name = 'activity_count'
    ) THEN
        ALTER TABLE public.daily_activities 
        ADD COLUMN activity_count integer NOT NULL DEFAULT 1;
        
        RAISE NOTICE 'Added activity_count column to daily_activities';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_activities' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.daily_activities 
        ADD COLUMN updated_at timestamptz DEFAULT now();
        
        RAISE NOTICE 'Added updated_at column to daily_activities';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_activities' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.daily_activities 
        ADD COLUMN created_at timestamptz DEFAULT now();
        
        RAISE NOTICE 'Added created_at column to daily_activities';
    END IF;
    
    -- Add unique constraint if it doesn't exist (prevents duplicate entries)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'daily_activities_user_date_type_key'
    ) THEN
        ALTER TABLE public.daily_activities 
        ADD CONSTRAINT daily_activities_user_date_type_key 
        UNIQUE (user_id, activity_date, activity_type);
        
        RAISE NOTICE 'Added unique constraint to daily_activities';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_id ON public.daily_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON public.daily_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_date ON public.daily_activities(user_id, activity_date);

-- Enable RLS
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own daily activities" ON public.daily_activities;
CREATE POLICY "Users can view their own daily activities"
    ON public.daily_activities
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily activities" ON public.daily_activities;
CREATE POLICY "Users can insert their own daily activities"
    ON public.daily_activities
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily activities" ON public.daily_activities;
CREATE POLICY "Users can update their own daily activities"
    ON public.daily_activities
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create trigger for updated_at (only if updated_at column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_activities' 
        AND column_name = 'updated_at'
    ) THEN
        DROP TRIGGER IF EXISTS handle_updated_at ON public.daily_activities;
        CREATE TRIGGER handle_updated_at
            BEFORE UPDATE ON public.daily_activities
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
        
        RAISE NOTICE 'Created updated_at trigger for daily_activities';
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.daily_activities TO authenticated;
GRANT ALL ON public.daily_activities TO service_role;

-- Add helpful comment
COMMENT ON TABLE public.daily_activities IS 'Tracks daily user activities for gamification system';

-- Create a helper view to see recent activity
CREATE OR REPLACE VIEW public.recent_daily_activities AS
SELECT 
    da.id,
    da.user_id,
    u.email,
    da.activity_date,
    da.activity_type,
    da.activity_count,
    da.created_at,
    da.updated_at
FROM public.daily_activities da
LEFT JOIN auth.users u ON u.id = da.user_id
ORDER BY da.activity_date DESC, da.created_at DESC
LIMIT 100;

-- Grant view permissions
GRANT SELECT ON public.recent_daily_activities TO authenticated;
GRANT SELECT ON public.recent_daily_activities TO service_role;

COMMENT ON VIEW public.recent_daily_activities IS 'Shows the 100 most recent daily activities for debugging';
