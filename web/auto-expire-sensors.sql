-- Function to automatically tag expired sensors
-- This function will find sensors that have reached their expiration date and add the "Expired" tag

CREATE OR REPLACE FUNCTION auto_tag_expired_sensors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_tag_id UUID;
    sensor_record RECORD;
BEGIN
    -- Get the "Expired" tag ID
    SELECT id INTO expired_tag_id 
    FROM public.tags 
    WHERE name = 'Expired' AND category = 'lifecycle'
    LIMIT 1;
    
    -- If the Expired tag doesn't exist, exit
    IF expired_tag_id IS NULL THEN
        RAISE NOTICE 'Expired tag not found in tags table';
        RETURN;
    END IF;
    
    -- Find sensors that are expired but don't have the expired tag yet
    FOR sensor_record IN
        SELECT DISTINCT s.id, s.user_id
        FROM public.sensors s
        INNER JOIN public.sensor_models sm ON s.sensor_model_id = sm.id
        WHERE s.is_deleted = false
        AND (s.date_added + INTERVAL '1 day' * sm.duration_days) < NOW()
        AND s.id NOT IN (
            SELECT st.sensor_id 
            FROM public.sensor_tags st 
            WHERE st.tag_id = expired_tag_id
        )
    LOOP
        -- Add the expired tag to this sensor
        INSERT INTO public.sensor_tags (sensor_id, tag_id)
        VALUES (sensor_record.id, expired_tag_id)
        ON CONFLICT (sensor_id, tag_id) DO NOTHING;
        
        RAISE NOTICE 'Added expired tag to sensor %', sensor_record.id;
    END LOOP;
END;
$$;

-- Create a trigger function that runs this check when sensors are updated or inserted
CREATE OR REPLACE FUNCTION check_sensor_expiration_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_tag_id UUID;
    sensor_expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the "Expired" tag ID
    SELECT id INTO expired_tag_id 
    FROM public.tags 
    WHERE name = 'Expired' AND category = 'lifecycle'
    LIMIT 1;
    
    -- If the Expired tag doesn't exist, skip
    IF expired_tag_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate when this sensor should expire
    SELECT (NEW.date_added + INTERVAL '1 day' * sm.duration_days)
    INTO sensor_expiry_date
    FROM public.sensor_models sm
    WHERE sm.id = NEW.sensor_model_id;
    
    -- If the sensor has expired and doesn't have the expired tag yet
    IF sensor_expiry_date < NOW() AND NOT EXISTS (
        SELECT 1 FROM public.sensor_tags st 
        WHERE st.sensor_id = NEW.id AND st.tag_id = expired_tag_id
    ) THEN
        -- Add the expired tag
        INSERT INTO public.sensor_tags (sensor_id, tag_id)
        VALUES (NEW.id, expired_tag_id)
        ON CONFLICT (sensor_id, tag_id) DO NOTHING;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger that runs when sensors are inserted or updated
DROP TRIGGER IF EXISTS sensor_expiration_check ON public.sensors;
CREATE TRIGGER sensor_expiration_check
    AFTER INSERT OR UPDATE ON public.sensors
    FOR EACH ROW
    EXECUTE FUNCTION check_sensor_expiration_trigger();

-- Run the function once to tag any existing expired sensors
SELECT auto_tag_expired_sensors();

-- Test: Show how many sensors got the expired tag
SELECT COUNT(*) as expired_sensors_tagged
FROM public.sensor_tags st
INNER JOIN public.tags t ON st.tag_id = t.id
WHERE t.name = 'Expired' AND t.category = 'lifecycle';