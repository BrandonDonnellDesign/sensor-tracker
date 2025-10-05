-- Create Dexcom API integration tables
-- This migration adds support for Dexcom API OAuth tokens and sync data

-- Table to store encrypted Dexcom API tokens per user
CREATE TABLE public.dexcom_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  access_token_encrypted TEXT NOT NULL, -- Encrypted access token
  refresh_token_encrypted TEXT NOT NULL, -- Encrypted refresh token
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'offline_access',
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Ensure one active token per user
  CONSTRAINT unique_active_token_per_user UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Table to store Dexcom sync status and preferences
CREATE TABLE public.dexcom_sync_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  auto_sync_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  sync_frequency_minutes INTEGER DEFAULT 60 NOT NULL, -- How often to sync
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  last_sync_error TEXT,
  sync_sensor_data BOOLEAN DEFAULT TRUE NOT NULL,
  sync_glucose_data BOOLEAN DEFAULT FALSE NOT NULL, -- Optional glucose data sync
  sync_device_status BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table to track Dexcom API sync operations
CREATE TABLE public.dexcom_sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL, -- 'manual', 'scheduled', 'webhook'
  operation TEXT NOT NULL, -- 'sensor_sync', 'glucose_sync', 'device_status'
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  api_calls_made INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add Dexcom-specific fields to sensors table
ALTER TABLE public.sensors 
ADD COLUMN dexcom_sensor_id TEXT UNIQUE, -- Dexcom's internal sensor ID
ADD COLUMN dexcom_activation_time TIMESTAMP WITH TIME ZONE, -- When activated in Dexcom system
ADD COLUMN dexcom_expiry_time TIMESTAMP WITH TIME ZONE, -- Dexcom's expiry calculation
ADD COLUMN dexcom_device_serial TEXT, -- Transmitter serial number
ADD COLUMN dexcom_last_reading_time TIMESTAMP WITH TIME ZONE, -- Last glucose reading
ADD COLUMN dexcom_battery_level INTEGER, -- Transmitter battery %
ADD COLUMN auto_detected BOOLEAN DEFAULT FALSE, -- Was this sensor auto-detected from API?
ADD COLUMN sync_enabled BOOLEAN DEFAULT TRUE; -- Allow this sensor to be synced

-- Create indexes for performance
CREATE INDEX idx_dexcom_tokens_user_id ON public.dexcom_tokens(user_id);
CREATE INDEX idx_dexcom_tokens_expires_at ON public.dexcom_tokens(token_expires_at);
CREATE INDEX idx_dexcom_sync_settings_user_id ON public.dexcom_sync_settings(user_id);
CREATE INDEX idx_dexcom_sync_log_user_id ON public.dexcom_sync_log(user_id);
CREATE INDEX idx_dexcom_sync_log_created_at ON public.dexcom_sync_log(created_at);
CREATE INDEX idx_sensors_dexcom_sensor_id ON public.sensors(dexcom_sensor_id) WHERE dexcom_sensor_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.dexcom_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dexcom_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dexcom_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dexcom_tokens
CREATE POLICY "Users can view their own Dexcom tokens" ON public.dexcom_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own Dexcom tokens" ON public.dexcom_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Dexcom tokens" ON public.dexcom_tokens
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own Dexcom tokens" ON public.dexcom_tokens
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for dexcom_sync_settings
CREATE POLICY "Users can view their own sync settings" ON public.dexcom_sync_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync settings" ON public.dexcom_sync_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync settings" ON public.dexcom_sync_settings
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for dexcom_sync_log (read-only for users)
CREATE POLICY "Users can view their own sync logs" ON public.dexcom_sync_log
  FOR SELECT USING (user_id = auth.uid());

-- System can insert sync logs
CREATE POLICY "System can insert sync logs" ON public.dexcom_sync_log
  FOR INSERT WITH CHECK (true);

-- Add trigger for updated_at timestamps
CREATE TRIGGER update_dexcom_tokens_updated_at 
  BEFORE UPDATE ON public.dexcom_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dexcom_sync_settings_updated_at 
  BEFORE UPDATE ON public.dexcom_sync_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.dexcom_tokens IS 'Encrypted storage for Dexcom API OAuth tokens';
COMMENT ON TABLE public.dexcom_sync_settings IS 'User preferences for Dexcom API synchronization';
COMMENT ON TABLE public.dexcom_sync_log IS 'Audit log of Dexcom API sync operations';

COMMENT ON COLUMN public.sensors.dexcom_sensor_id IS 'Dexcom internal sensor identifier for API correlation';
COMMENT ON COLUMN public.sensors.auto_detected IS 'True if sensor was automatically detected from Dexcom API';
COMMENT ON COLUMN public.sensors.sync_enabled IS 'Whether this sensor should be synced with Dexcom API';