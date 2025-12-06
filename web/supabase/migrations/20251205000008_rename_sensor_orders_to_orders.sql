-- Rename sensor_orders table to orders for better clarity
-- This table tracks all medical supply orders, not just sensors

-- Rename the table
ALTER TABLE sensor_orders RENAME TO orders;

-- Rename the sequence
ALTER SEQUENCE IF EXISTS sensor_orders_id_seq RENAME TO orders_id_seq;

-- Update indexes
ALTER INDEX IF EXISTS idx_sensor_orders_user_id RENAME TO idx_orders_user_id;
ALTER INDEX IF EXISTS idx_sensor_orders_status RENAME TO idx_orders_status;

-- RLS policies are automatically updated when table is renamed
-- No need to rename them explicitly

-- Update comments
COMMENT ON TABLE orders IS 'Tracks all medical supply orders (sensors, insulin, etc.) from various suppliers';
