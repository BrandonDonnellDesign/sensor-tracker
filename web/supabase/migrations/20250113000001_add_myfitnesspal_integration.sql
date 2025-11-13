-- MyFitnessPal Integration Tables

-- Store MyFitnessPal OAuth tokens
CREATE TABLE IF NOT EXISTS myfitnesspal_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Store MyFitnessPal sync settings
CREATE TABLE IF NOT EXISTS myfitnesspal_sync_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_frequency_minutes INTEGER DEFAULT 60,
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_food_logs BOOLEAN DEFAULT true,
  sync_water_intake BOOLEAN DEFAULT true,
  sync_exercise BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Store MyFitnessPal sync logs
CREATE TABLE IF NOT EXISTS myfitnesspal_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'manual', 'auto', 'initial'
  operation TEXT NOT NULL, -- 'sync_food', 'sync_water', 'connect_account', etc.
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  records_processed INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  error_message TEXT,
  sync_started_at TIMESTAMPTZ DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE myfitnesspal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE myfitnesspal_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE myfitnesspal_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for myfitnesspal_tokens
CREATE POLICY "Users can view their own MyFitnessPal tokens"
  ON myfitnesspal_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MyFitnessPal tokens"
  ON myfitnesspal_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MyFitnessPal tokens"
  ON myfitnesspal_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MyFitnessPal tokens"
  ON myfitnesspal_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for myfitnesspal_sync_settings
CREATE POLICY "Users can view their own MyFitnessPal sync settings"
  ON myfitnesspal_sync_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MyFitnessPal sync settings"
  ON myfitnesspal_sync_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MyFitnessPal sync settings"
  ON myfitnesspal_sync_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MyFitnessPal sync settings"
  ON myfitnesspal_sync_settings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for myfitnesspal_sync_log
CREATE POLICY "Users can view their own MyFitnessPal sync logs"
  ON myfitnesspal_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MyFitnessPal sync logs"
  ON myfitnesspal_sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_myfitnesspal_tokens_user_id ON myfitnesspal_tokens(user_id);
CREATE INDEX idx_myfitnesspal_tokens_is_active ON myfitnesspal_tokens(is_active);
CREATE INDEX idx_myfitnesspal_sync_settings_user_id ON myfitnesspal_sync_settings(user_id);
CREATE INDEX idx_myfitnesspal_sync_log_user_id ON myfitnesspal_sync_log(user_id);
CREATE INDEX idx_myfitnesspal_sync_log_created_at ON myfitnesspal_sync_log(created_at DESC);

-- Add updated_at trigger for myfitnesspal_tokens
CREATE TRIGGER update_myfitnesspal_tokens_updated_at
  BEFORE UPDATE ON myfitnesspal_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for myfitnesspal_sync_settings
CREATE TRIGGER update_myfitnesspal_sync_settings_updated_at
  BEFORE UPDATE ON myfitnesspal_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
