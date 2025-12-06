-- Fix search_path for security-sensitive functions
-- This prevents search_path injection attacks

-- Fix increment_inventory
CREATE OR REPLACE FUNCTION increment_inventory(
    p_user_id UUID,
    p_sensor_model_id UUID,
    p_quantity INTEGER
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if inventory record exists
    IF EXISTS (
        SELECT 1 FROM sensor_inventory 
        WHERE user_id = p_user_id 
        AND sensor_model_id = p_sensor_model_id
    ) THEN
        -- Update existing inventory
        UPDATE sensor_inventory
        SET 
            quantity = quantity + p_quantity,
            last_updated = NOW()
        WHERE user_id = p_user_id 
        AND sensor_model_id = p_sensor_model_id;
    ELSE
        -- Create new inventory record
        INSERT INTO sensor_inventory (user_id, sensor_model_id, quantity)
        VALUES (p_user_id, p_sensor_model_id, p_quantity);
    END IF;
END;
$$;

-- Fix reduce_inventory_on_sensor_add
CREATE OR REPLACE FUNCTION reduce_inventory_on_sensor_add()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only reduce inventory for new sensors (not updates)
    IF TG_OP = 'INSERT' THEN
        -- Check if inventory exists for this sensor model
        UPDATE sensor_inventory
        SET 
            quantity = GREATEST(0, quantity - 1),
            last_updated = NOW()
        WHERE user_id = NEW.user_id 
            AND sensor_model_id = NEW.sensor_model_id
            AND quantity > 0;
        
        -- Log if inventory was reduced
        IF FOUND THEN
            RAISE NOTICE 'Inventory reduced for user % sensor model %', NEW.user_id, NEW.sensor_model_id;
        ELSE
            RAISE NOTICE 'No inventory to reduce for user % sensor model %', NEW.user_id, NEW.sensor_model_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_replacement_tracking_updated_at
CREATE OR REPLACE FUNCTION update_replacement_tracking_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_notifications_updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
