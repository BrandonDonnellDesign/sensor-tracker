-- Simple replacement sensor tracking for warranty claims
CREATE TABLE IF NOT EXISTS replacement_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    sensor_serial_number TEXT NOT NULL,
    sensor_lot_number TEXT,
    warranty_claim_number TEXT,
    carrier TEXT NOT NULL CHECK (carrier IN ('ups', 'fedex', 'usps', 'dhl', 'other')),
    tracking_number TEXT NOT NULL,
    expected_delivery DATE,
    status TEXT NOT NULL DEFAULT 'shipped' CHECK (status IN ('shipped', 'in_transit', 'out_for_delivery', 'delivered')),
    delivered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_replacement_tracking_user_id ON replacement_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_replacement_tracking_status ON replacement_tracking(status);
CREATE INDEX IF NOT EXISTS idx_replacement_tracking_tracking_number ON replacement_tracking(tracking_number);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_replacement_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_replacement_tracking_updated_at 
    BEFORE UPDATE ON replacement_tracking 
    FOR EACH ROW 
    EXECUTE FUNCTION update_replacement_tracking_updated_at();