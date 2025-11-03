-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'premium')),
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  user_agent TEXT,
  referer TEXT,
  request_size INTEGER,
  response_size INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_api_key_id ON api_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_id ON api_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_ip_address ON api_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start ON api_rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_endpoint ON api_rate_limits(endpoint);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);

-- Create updated_at trigger for api_keys
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  -- Delete rate limit records older than 24 hours
  DELETE FROM api_rate_limits 
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  -- Delete usage logs older than 30 days
  DELETE FROM api_usage_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_endpoint TEXT DEFAULT 'general',
  p_rate_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_count INTEGER,
  limit_value INTEGER,
  reset_time TIMESTAMPTZ
) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_reset_time TIMESTAMPTZ;
BEGIN
  -- Calculate current hour window
  v_window_start := date_trunc('hour', NOW());
  v_reset_time := v_window_start + INTERVAL '1 hour';
  
  -- Get current count for this window
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_current_count
  FROM api_rate_limits
  WHERE 
    COALESCE(api_key_id::text, '') = COALESCE(p_api_key_id::text, '') AND
    COALESCE(user_id::text, '') = COALESCE(p_user_id::text, '') AND
    COALESCE(ip_address::text, '') = COALESCE(p_ip_address::text, '') AND
    endpoint = p_endpoint AND
    window_start = v_window_start;
  
  -- Return result
  RETURN QUERY SELECT 
    (v_current_count < p_rate_limit) as allowed,
    v_current_count as current_count,
    p_rate_limit as limit_value,
    v_reset_time as reset_time;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_api_key_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_endpoint TEXT DEFAULT 'general'
)
RETURNS void AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_existing_count INTEGER;
BEGIN
  v_window_start := date_trunc('hour', NOW());
  
  -- Try to update existing record first
  UPDATE api_rate_limits 
  SET request_count = request_count + 1,
      created_at = NOW()
  WHERE 
    COALESCE(api_key_id::text, '') = COALESCE(p_api_key_id::text, '') AND
    COALESCE(user_id::text, '') = COALESCE(p_user_id::text, '') AND
    COALESCE(ip_address::text, '') = COALESCE(p_ip_address::text, '') AND
    endpoint = p_endpoint AND
    window_start = v_window_start;
  
  -- If no rows were updated, insert a new record
  IF NOT FOUND THEN
    INSERT INTO api_rate_limits (api_key_id, user_id, ip_address, endpoint, request_count, window_start)
    VALUES (p_api_key_id, p_user_id, p_ip_address, p_endpoint, 1, v_window_start);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create unique index for rate limiting (handles NULLs properly)
CREATE UNIQUE INDEX idx_unique_rate_limit_window ON api_rate_limits (
  COALESCE(api_key_id::text, ''),
  COALESCE(user_id::text, ''), 
  COALESCE(ip_address::text, ''),
  endpoint,
  window_start
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for api_usage_logs (users can view their own logs)
CREATE POLICY "Users can view their own API usage logs" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for api_rate_limits (users can view their own rate limits)
CREATE POLICY "Users can view their own rate limits" ON api_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON api_keys TO anon, authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_rate_limits TO anon, authenticated;
GRANT ALL ON api_usage_logs TO anon, authenticated;

-- Create view for API key statistics
CREATE OR REPLACE VIEW api_key_stats AS
SELECT 
  ak.id,
  ak.name,
  ak.key_prefix,
  ak.tier,
  ak.rate_limit_per_hour,
  ak.is_active,
  ak.last_used_at,
  ak.created_at,
  COALESCE(usage_stats.total_requests, 0) as total_requests,
  COALESCE(usage_stats.requests_today, 0) as requests_today,
  COALESCE(usage_stats.requests_this_hour, 0) as requests_this_hour
FROM api_keys ak
LEFT JOIN (
  SELECT 
    api_key_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as requests_today,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('hour', NOW())) as requests_this_hour
  FROM api_usage_logs
  GROUP BY api_key_id
) usage_stats ON ak.id = usage_stats.api_key_id;

-- Grant access to the view
GRANT SELECT ON api_key_stats TO authenticated;