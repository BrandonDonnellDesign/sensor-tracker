-- Fix inventory reduction trigger
-- Ensure it works properly when sensors are added

-- Drop and recreate the function with proper error handling
CREATE OR REPLACE FUNCTION reduce_inventory_on_sensor_add()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_reduce_inventory_on_sensor_add ON sensors;
CREATE TRIGGER trigger_reduce_inventory_on_sensor_add
  AFTER INSERT ON sensors
  FOR EACH ROW
  EXECUTE FUNCTION reduce_inventory_on_sensor_add();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON sensor_inventory TO authenticated;
