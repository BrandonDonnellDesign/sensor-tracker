-- Fix Dexcom Sync Log Table Structure (Complete Fix)
-- Based on the actual error, the table has an 'operation' column that's NOT NULL

-- First, let's see what the actual table structure is and fix it
DO $$
DECLARE
    table_exists boolean;
    column_info record;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dexcom_sync_log'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'dexcom_sync_log table exists, checking structure...';
        
        -- Show current columns
        FOR column_info IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dexcom_sync_log'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %', 
                column_info.column_name, 
                column_info.data_type, 
                column_info.is_nullable, 
                column_info.column_default;
        END LOOP;
    ELSE
        RAISE NOTICE 'dexcom_sync_log table does not exist, will create it';
    END IF;
END $$;

-- Create or modify the table to match what the functions expect
CREATE TABLE IF NOT EXISTS public.dexcom_sync_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    operation text, -- This column exists and is NOT NULL based on error
    sync_type text NOT NULL,
    status text NOT NULL,
    message text,
    error_details jsonb,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add message column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dexcom_sync_log' 
        AND column_name = 'message'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.dexcom_sync_log ADD COLUMN message text;
        RAISE NOTICE 'Added message column to dexcom_sync_log';
    END IF;
    
    -- Add error_details column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dexcom_sync_log' 
        AND column_name = 'error_details'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.dexcom_sync_log ADD COLUMN error_details jsonb;
        RAISE NOTICE 'Added error_details column to dexcom_sync_log';
    END IF;
    
    -- Add operation column if it doesn't exist (but make it nullable first)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dexcom_sync_log' 
        AND column_name = 'operation'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.dexcom_sync_log ADD COLUMN operation text;
        RAISE NOTICE 'Added operation column to dexcom_sync_log';
    END IF;
    
    -- Make operation column nullable if it exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dexcom_sync_log' 
        AND column_name = 'operation'
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.dexcom_sync_log ALTER COLUMN operation DROP NOT NULL;
        RAISE NOTICE 'Made operation column nullable in dexcom_sync_log';
    END IF;
    
    -- Ensure user_id can be NULL for system operations
    ALTER TABLE public.dexcom_sync_log ALTER COLUMN user_id DROP NOT NULL;
    
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dexcom_sync_log_user_id ON public.dexcom_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_dexcom_sync_log_created_at ON public.dexcom_sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_dexcom_sync_log_sync_type ON public.dexcom_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_dexcom_sync_log_status ON public.dexcom_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_dexcom_sync_log_operation ON public.dexcom_sync_log(operation);

-- Enable RLS
ALTER TABLE public.dexcom_sync_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.dexcom_sync_log;
CREATE POLICY "Users can view their own sync logs" ON public.dexcom_sync_log
    FOR SELECT USING (
        auth.uid() = user_id OR 
        user_id IS NULL OR -- Allow viewing system logs
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "System can insert sync logs" ON public.dexcom_sync_log;
CREATE POLICY "System can insert sync logs" ON public.dexcom_sync_log
    FOR INSERT WITH CHECK (true); -- Allow system inserts

-- Grant permissions
GRANT SELECT, INSERT ON public.dexcom_sync_log TO authenticated;
GRANT ALL ON public.dexcom_sync_log TO postgres;

-- Add comment for documentation
COMMENT ON TABLE public.dexcom_sync_log IS 'Logs for Dexcom API synchronization and auto-refresh operations';
COMMENT ON COLUMN public.dexcom_sync_log.operation IS 'Type of operation performed (nullable for backward compatibility)';
COMMENT ON COLUMN public.dexcom_sync_log.sync_type IS 'Specific sync operation type';
COMMENT ON COLUMN public.dexcom_sync_log.message IS 'Human-readable log message';
COMMENT ON COLUMN public.dexcom_sync_log.error_details IS 'Structured error information in JSON format';