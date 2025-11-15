-- Sensor Inventory Tracking Migration
-- Allows users to track their sensor supply and get reorder alerts

-- Create sensor_inventory table
CREATE TABLE IF NOT EXISTS sensor_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sensor_model_id UUID REFERENCES sensor_models(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  location TEXT, -- e.g., "Home", "Office", "Travel bag"
  notes TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sensor_orders table for tracking shipments
CREATE TABLE IF NOT EXISTS sensor_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sensor_model_id UUID REFERENCES sensor_models(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'shipped', 'delivered', 'cancelled')),
  supplier TEXT,
  order_number TEXT,
  cost NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_alerts table for tracking alert preferences
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sensor_model_id UUID REFERENCES sensor_models(id) ON DELETE CASCADE,
  low_stock_threshold INTEGER NOT NULL DEFAULT 2,
  reorder_threshold INTEGER NOT NULL DEFAULT 4,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sensor_model_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sensor_inventory_user_id ON sensor_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_inventory_model_id ON sensor_inventory(sensor_model_id);
CREATE INDEX IF NOT EXISTS idx_sensor_orders_user_id ON sensor_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_orders_status ON sensor_orders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_user_id ON inventory_alerts(user_id);

-- Enable RLS
ALTER TABLE sensor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensor_inventory
CREATE POLICY "Users can view their own inventory" ON sensor_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory" ON sensor_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" ON sensor_inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" ON sensor_inventory
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sensor_orders
CREATE POLICY "Users can view their own orders" ON sensor_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON sensor_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON sensor_orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" ON sensor_orders
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for inventory_alerts
CREATE POLICY "Users can view their own alert settings" ON inventory_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert settings" ON inventory_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings" ON inventory_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert settings" ON inventory_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_sensor_inventory_updated_at
  BEFORE UPDATE ON sensor_inventory
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_sensor_orders_updated_at
  BEFORE UPDATE ON sensor_orders
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_inventory_alerts_updated_at
  BEFORE UPDATE ON inventory_alerts
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

-- Function to automatically update inventory when order is delivered
CREATE OR REPLACE FUNCTION update_inventory_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status changed to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Check if inventory record exists
    IF EXISTS (
      SELECT 1 FROM sensor_inventory 
      WHERE user_id = NEW.user_id 
      AND sensor_model_id = NEW.sensor_model_id
    ) THEN
      -- Update existing inventory
      UPDATE sensor_inventory
      SET quantity = quantity + NEW.quantity,
          last_updated = NOW()
      WHERE user_id = NEW.user_id 
      AND sensor_model_id = NEW.sensor_model_id;
    ELSE
      -- Create new inventory record
      INSERT INTO sensor_inventory (user_id, sensor_model_id, quantity)
      VALUES (NEW.user_id, NEW.sensor_model_id, NEW.quantity);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update inventory when order is delivered
CREATE TRIGGER trigger_update_inventory_on_delivery
  AFTER INSERT OR UPDATE ON sensor_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_delivery();

-- Function to check inventory levels and create alerts
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS void AS $$
DECLARE
  inventory_record RECORD;
  alert_settings RECORD;
BEGIN
  -- Loop through all inventory records
  FOR inventory_record IN 
    SELECT si.*, sm.model_name, sm.manufacturer
    FROM sensor_inventory si
    LEFT JOIN sensor_models sm ON si.sensor_model_id = sm.id
    WHERE si.quantity >= 0
  LOOP
    -- Get alert settings for this user/model
    SELECT * INTO alert_settings
    FROM inventory_alerts
    WHERE user_id = inventory_record.user_id
    AND sensor_model_id = inventory_record.sensor_model_id;
    
    -- Use default thresholds if no settings exist
    IF alert_settings IS NULL THEN
      alert_settings.low_stock_threshold := 2;
      alert_settings.alerts_enabled := true;
    END IF;
    
    -- Check if alerts are enabled
    IF alert_settings.alerts_enabled THEN
      -- Low stock alert
      IF inventory_record.quantity <= alert_settings.low_stock_threshold THEN
        -- Check if alert already exists
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = inventory_record.user_id
          AND type = 'alert'
          AND title LIKE '%Low Sensor Inventory%'
          AND created_at > NOW() - INTERVAL '7 days'
          AND dismissed_at IS NULL
        ) THEN
          INSERT INTO notifications (user_id, type, title, message, metadata)
          VALUES (
            inventory_record.user_id,
            'alert',
            '⚠️ Low Sensor Inventory',
            format('You have %s sensor(s) remaining. Consider ordering more soon.', inventory_record.quantity),
            jsonb_build_object(
              'inventory_id', inventory_record.id,
              'quantity', inventory_record.quantity,
              'sensor_model', inventory_record.model_name
            )
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Log the migration
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'inventory',
  'Sensor inventory tracking system created',
  '{"tables": ["sensor_inventory", "sensor_orders", "inventory_alerts"]}'::jsonb
)
ON CONFLICT DO NOTHING;
