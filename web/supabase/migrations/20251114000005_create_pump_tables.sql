-- Pump Data Tables for Glooko Import
-- Separates high-frequency pump data from manual insulin logs

-- Unified delivery log for all pump insulin delivery
CREATE TABLE pump_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  amount NUMERIC(6,2),
  delivery_type TEXT, -- basal, temp_basal, auto_basal, micro_bolus, bolus
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump bolus events (meal, correction, extended boluses)
CREATE TABLE pump_bolus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  units NUMERIC(6,2),
  bolus_type TEXT, -- meal, correction, auto_correction, extended
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump basal events (scheduled, temp basal, suspend/resume)
CREATE TABLE pump_basal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  basal_rate NUMERIC(6,3),
  duration_minutes INT,
  basal_type TEXT, -- scheduled, temp, suspend, resume
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump status events (pod changes, alarms, errors)
CREATE TABLE pump_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  status TEXT, -- pod_change, alarm, occlusion, low_reservoir, expired
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pump_delivery_user_timestamp ON pump_delivery_logs(user_id, timestamp DESC);
CREATE INDEX idx_pump_delivery_type ON pump_delivery_logs(user_id, delivery_type, timestamp DESC);
CREATE INDEX idx_pump_bolus_user_timestamp ON pump_bolus_events(user_id, timestamp DESC);
CREATE INDEX idx_pump_bolus_type ON pump_bolus_events(user_id, bolus_type, timestamp DESC);
CREATE INDEX idx_pump_basal_user_timestamp ON pump_basal_events(user_id, timestamp DESC);
CREATE INDEX idx_pump_basal_type ON pump_basal_events(user_id, basal_type, timestamp DESC);
CREATE INDEX idx_pump_status_user_timestamp ON pump_status_events(user_id, timestamp DESC);
CREATE INDEX idx_pump_status_status ON pump_status_events(user_id, status, timestamp DESC);

-- Enable RLS
ALTER TABLE pump_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_bolus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_basal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_status_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their own pump delivery logs" ON pump_delivery_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own pump bolus events" ON pump_bolus_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own pump basal events" ON pump_basal_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own pump status events" ON pump_status_events
  FOR ALL USING (auth.uid() = user_id);

-- Create unified view for all insulin delivery (pump + manual)
CREATE OR REPLACE VIEW all_insulin_delivery AS
SELECT 
  id,
  user_id,
  taken_at as timestamp,
  units as amount,
  delivery_type,
  'manual' as source,
  created_at
FROM insulin_logs
UNION ALL
SELECT 
  id,
  user_id,
  timestamp,
  amount,
  delivery_type,
  'pump' as source,
  created_at
FROM pump_delivery_logs
ORDER BY timestamp DESC;

-- Grant access to view
GRANT SELECT ON all_insulin_delivery TO authenticated;

-- Create function to calculate IOB from all sources
CREATE OR REPLACE FUNCTION calculate_total_iob(
  p_user_id UUID,
  p_at_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  total_iob NUMERIC := 0;
  insulin_record RECORD;
  hours_ago NUMERIC;
  remaining_fraction NUMERIC;
BEGIN
  -- Get all insulin from last 4 hours (rapid-acting duration)
  FOR insulin_record IN
    SELECT timestamp, amount, delivery_type
    FROM all_insulin_delivery
    WHERE user_id = p_user_id
      AND timestamp > p_at_time - INTERVAL '4 hours'
      AND timestamp <= p_at_time
  LOOP
    -- Calculate hours since dose
    hours_ago := EXTRACT(EPOCH FROM (p_at_time - insulin_record.timestamp)) / 3600.0;
    
    -- Exponential decay: remaining = e^(-hours/duration)
    -- Using 4-hour duration for rapid-acting
    remaining_fraction := EXP(-hours_ago / 4.0);
    
    -- Add to total IOB
    total_iob := total_iob + (insulin_record.amount * remaining_fraction);
  END LOOP;
  
  RETURN ROUND(total_iob, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the migration
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'pump',
  'Pump data tables created for Glooko import',
  '{"tables": ["pump_bolus_events", "pump_basal_events", "pump_status_events", "pump_delivery_logs"]}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE pump_bolus_events IS 'Pump bolus deliveries from Glooko import';
COMMENT ON TABLE pump_basal_events IS 'Pump basal rates and temp basals from Glooko import';
COMMENT ON TABLE pump_status_events IS 'Pump status changes, alarms, and pod changes';
COMMENT ON TABLE pump_delivery_logs IS 'Unified log of all pump insulin delivery';
COMMENT ON VIEW all_insulin_delivery IS 'Unified view combining manual logs and pump data';
COMMENT ON FUNCTION calculate_total_iob IS 'Calculate IOB from all insulin sources (manual + pump)';
