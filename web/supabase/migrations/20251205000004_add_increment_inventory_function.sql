-- Create function to increment inventory when orders are delivered
CREATE OR REPLACE FUNCTION increment_inventory(
    p_user_id UUID,
    p_sensor_model_id UUID,
    p_quantity INTEGER
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_inventory(UUID, UUID, INTEGER) TO authenticated;
