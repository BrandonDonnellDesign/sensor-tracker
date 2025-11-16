-- Create sensor replacements tracking table
CREATE TABLE IF NOT EXISTS public.sensor_replacements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sensor_serial_number text NOT NULL,
    sensor_lot_number text,
    sensor_model_id uuid REFERENCES public.sensor_models(id) ON DELETE SET NULL,
    warranty_claim_number text,
    carrier text NOT NULL,
    tracking_number text NOT NULL,
    expected_delivery date,
    status text NOT NULL DEFAULT 'shipped',
    delivered_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Migrate data from old replacement_tracking table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'replacement_tracking') THEN
        -- Get the current user's ID (the one running the migration)
        INSERT INTO public.sensor_replacements (
            id,
            user_id,
            sensor_serial_number,
            sensor_lot_number,
            warranty_claim_number,
            carrier,
            tracking_number,
            expected_delivery,
            status,
            delivered_at,
            notes,
            created_at,
            updated_at
        )
        SELECT 
            id,
            auth.uid(), -- Use current authenticated user's ID
            sensor_serial_number,
            sensor_lot_number,
            warranty_claim_number,
            carrier,
            tracking_number,
            expected_delivery,
            status,
            delivered_at,
            notes,
            created_at,
            updated_at
        FROM public.replacement_tracking
        WHERE user_id = '00000000-0000-0000-0000-000000000000'
        ON CONFLICT (id) DO NOTHING;
        
        -- Drop the old table
        DROP TABLE public.replacement_tracking;
        
        RAISE NOTICE 'Migrated data from replacement_tracking to sensor_replacements';
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS sensor_replacements_user_id_idx ON public.sensor_replacements(user_id);
CREATE INDEX IF NOT EXISTS sensor_replacements_status_idx ON public.sensor_replacements(status);
CREATE INDEX IF NOT EXISTS sensor_replacements_tracking_number_idx ON public.sensor_replacements(tracking_number);
CREATE INDEX IF NOT EXISTS sensor_replacements_sensor_model_id_idx ON public.sensor_replacements(sensor_model_id);

-- Enable RLS
ALTER TABLE public.sensor_replacements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own replacements"
    ON public.sensor_replacements
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own replacements"
    ON public.sensor_replacements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replacements"
    ON public.sensor_replacements
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replacements"
    ON public.sensor_replacements
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add check constraint for status
ALTER TABLE public.sensor_replacements
    ADD CONSTRAINT sensor_replacements_status_check
    CHECK (status IN ('shipped', 'in_transit', 'out_for_delivery', 'delivered'));

COMMENT ON TABLE public.sensor_replacements IS 'Tracks replacement sensor shipments from warranty claims';
COMMENT ON COLUMN public.sensor_replacements.sensor_model_id IS 'Optional link to sensor model for automatic inventory tracking when marked as delivered';
