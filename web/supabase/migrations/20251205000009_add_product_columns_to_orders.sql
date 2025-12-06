-- Add flexible product columns to orders table
-- This allows tracking any medical supply (sensors, insulin, pump supplies, etc.)

-- Add new columns for flexible product tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS product_id UUID;

-- Add check constraint for product_type
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_product_type_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_product_type_check 
CHECK (product_type IS NULL OR product_type IN ('sensor', 'insulin', 'pump_supply', 'test_strip', 'lancet', 'other'));

-- Add index for product queries
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON orders(product_type);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- Add comment explaining the columns
COMMENT ON COLUMN orders.sensor_model_id IS 'Legacy column for sensor orders. Use product_id and product_type for new orders.';
COMMENT ON COLUMN orders.product_type IS 'Type of product: sensor, insulin, pump_supply, test_strip, lancet, other';
COMMENT ON COLUMN orders.product_name IS 'Human-readable product name (e.g., "Dexcom G7", "Humalog", "Omnipod Pods")';
COMMENT ON COLUMN orders.product_id IS 'Generic reference to product (sensor_model_id, insulin_type_id, etc.)';

-- Update existing orders to have product_type = 'sensor' where sensor_model_id is set
UPDATE orders 
SET 
    product_type = 'sensor',
    product_id = sensor_model_id
WHERE sensor_model_id IS NOT NULL 
AND product_type IS NULL;
