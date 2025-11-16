-- Migrate data from replacement_tracking to sensor_replacements
-- First, get the user ID from profiles (assuming there's only one user or you want the first one)
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get the first user ID from profiles table
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in profiles table. Please create a user first.';
    END IF;
    
    -- Copy all data with the found user ID
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
        v_user_id, -- Use the found user ID
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
    
    RAISE NOTICE 'Migrated % records to sensor_replacements for user %', 
        (SELECT COUNT(*) FROM public.replacement_tracking WHERE user_id = '00000000-0000-0000-0000-000000000000'),
        v_user_id;
END $$;

-- Drop the old table
DROP TABLE IF EXISTS public.replacement_tracking;
