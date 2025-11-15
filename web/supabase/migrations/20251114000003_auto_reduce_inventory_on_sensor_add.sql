-- Auto-reduce inventory when a sensor is added
-- This ensures inventory count stays accurate when users start tracking a new sensor

-- Function to reduce inventory when a sensor is added
CREATE OR REPLACE FUNCTION reduce_inventory_on_sensor_add()
RETURNS TRIGGER AS $$
BEGIN
  -- Only reduce inventory for new sensors (not updates)
  IF TG_OP = 'INSERT' THEN
    -- Check if inventory exists for this sensor model
    IF EXISTS (
      SELECT 1 FROM sensor_inventory 
      WHERE user_id = NEW.user_id 
      AND sensor_model_id = NEW.sensor_model_id
      AND quantity > 0
    ) THEN
      -- Reduce inventory by 1
      UPDATE sensor_inventory
      SET quantity = GREATEST(0, quantity - 1),
          last_updated = NOW()
      WHERE user_id = NEW.user_id 
      AND sensor_model_id = NEW.sensor_model_id;
      
      -- Log the reduction
      INSERT INTO system_logs (level, category, message, metadata)
      VALUES (
        'info',
        'inventory',
        'Inventory reduced on sensor add',
        jsonb_build_object(
          'user_id', NEW.user_id,
          'sensor_id', NEW.id,
          'sensor_model_id', NEW.sensor_model_id
        )
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on sensors table
DROP TRIGGER IF EXISTS trigger_reduce_inventory_on_sensor_add ON sensors;
CREATE TRIGGER trigger_reduce_inventory_on_sensor_add
  AFTER INSERT ON sensors
  FOR EACH ROW
  EXECUTE FUNCTION reduce_inventory_on_sensor_add();

-- Log the migration
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'inventory',
  'Auto-reduce inventory trigger created',
  '{"trigger": "reduce_inventory_on_sensor_add"}'::jsonb
)
ON CONFLICT DO NOTHING;
