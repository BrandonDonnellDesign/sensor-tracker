-- Public API System Migration
-- Adds API keys, rate limiting, and public endpoints

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  rate_limit VARCHAR(20) DEFAULT 'authenticated', -- 'public', 'authenticated', 'premium'
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at);

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_size INTEGER,
  response_size INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for API usage logs
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);

-- Create API rate limits table (for persistent rate limiting)
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_identifier VARCHAR(255) NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_duration_ms INTEGER NOT NULL,
  max_requests INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key_identifier, window_start)
);

-- Create index for rate limits
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_identifier ON api_rate_limits(key_identifier);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start ON api_rate_limits(window_start);

-- Create webhooks table for API integrations
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['tip.created', 'comment.created', etc.]
  secret VARCHAR(255), -- For webhook signature verification
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  max_failures INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- Create webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT false,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_success ON webhook_deliveries(success);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Enable RLS on new tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can manage their own API keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all API keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for api_usage_logs
CREATE POLICY "Users can view their own API usage"
  ON api_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all API usage"
  ON api_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert API usage logs"
  ON api_usage_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for webhooks
CREATE POLICY "Users can manage their own webhooks"
  ON webhooks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all webhooks"
  ON webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for webhook_deliveries
CREATE POLICY "Users can view their webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks 
      WHERE id = webhook_deliveries.webhook_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage webhook deliveries"
  ON webhook_deliveries FOR ALL
  WITH CHECK (true);

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  p_api_key_id UUID,
  p_user_id UUID,
  p_endpoint VARCHAR(255),
  p_method VARCHAR(10),
  p_status_code INTEGER,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_size INTEGER DEFAULT NULL,
  p_response_size INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO api_usage_logs (
    api_key_id,
    user_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    user_agent,
    request_size,
    response_size,
    error_message
  ) VALUES (
    p_api_key_id,
    p_user_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_ip_address,
    p_user_agent,
    p_request_size,
    p_response_size,
    p_error_message
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key_identifier VARCHAR(255),
  p_window_duration_ms INTEGER,
  p_max_requests INTEGER
) RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_window_start TIMESTAMP WITH TIME ZONE;
  rate_limit_record RECORD;
BEGIN
  -- Calculate current window start
  current_window_start := DATE_TRUNC('hour', NOW()) + 
    INTERVAL '1 hour' * FLOOR(EXTRACT(EPOCH FROM (NOW() - DATE_TRUNC('hour', NOW()))) / (p_window_duration_ms / 1000.0 / 3600.0));
  
  -- Get or create rate limit record
  SELECT * INTO rate_limit_record
  FROM api_rate_limits
  WHERE key_identifier = p_key_identifier
    AND window_start = current_window_start;
  
  IF NOT FOUND THEN
    -- Create new window
    INSERT INTO api_rate_limits (
      key_identifier,
      request_count,
      window_start,
      window_duration_ms,
      max_requests
    ) VALUES (
      p_key_identifier,
      1,
      current_window_start,
      p_window_duration_ms,
      p_max_requests
    );
    
    RETURN QUERY SELECT true, 1, current_window_start + INTERVAL '1 millisecond' * p_window_duration_ms;
  ELSE
    -- Update existing window
    IF rate_limit_record.request_count < p_max_requests THEN
      UPDATE api_rate_limits
      SET request_count = request_count + 1,
          updated_at = NOW()
      WHERE key_identifier = p_key_identifier
        AND window_start = current_window_start;
      
      RETURN QUERY SELECT true, rate_limit_record.request_count + 1, current_window_start + INTERVAL '1 millisecond' * p_window_duration_ms;
    ELSE
      RETURN QUERY SELECT false, rate_limit_record.request_count, current_window_start + INTERVAL '1 millisecond' * p_window_duration_ms;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(
  p_user_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_requests INTEGER,
  successful_requests INTEGER,
  failed_requests INTEGER,
  avg_response_time DECIMAL,
  top_endpoints JSONB,
  daily_usage JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH usage_data AS (
    SELECT *
    FROM api_usage_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND created_at::DATE BETWEEN p_start_date AND p_end_date
  ),
  stats AS (
    SELECT 
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE status_code < 400)::INTEGER as successful,
      COUNT(*) FILTER (WHERE status_code >= 400)::INTEGER as failed,
      ROUND(AVG(response_time_ms), 2) as avg_time
    FROM usage_data
  ),
  endpoints AS (
    SELECT jsonb_object_agg(
      endpoint,
      jsonb_build_object(
        'count', count,
        'avg_response_time', avg_response_time
      )
    ) as top_endpoints_json
    FROM (
      SELECT 
        endpoint,
        COUNT(*)::INTEGER as count,
        ROUND(AVG(response_time_ms), 2) as avg_response_time
      FROM usage_data
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    ) top_eps
  ),
  daily AS (
    SELECT jsonb_object_agg(
      usage_date::TEXT,
      jsonb_build_object(
        'requests', request_count,
        'avg_response_time', avg_response_time
      )
    ) as daily_usage_json
    FROM (
      SELECT 
        created_at::DATE as usage_date,
        COUNT(*)::INTEGER as request_count,
        ROUND(AVG(response_time_ms), 2) as avg_response_time
      FROM usage_data
      GROUP BY created_at::DATE
      ORDER BY usage_date
    ) daily_data
  )
  SELECT 
    stats.total,
    stats.successful,
    stats.failed,
    stats.avg_time,
    endpoints.top_endpoints_json,
    daily.daily_usage_json
  FROM stats, endpoints, daily;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_api_usage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_api_usage_stats TO authenticated;

-- Create default API permissions
INSERT INTO api_keys (user_id, name, key_hash, permissions, rate_limit, is_active)
SELECT 
  id,
  'Default API Key',
  'default_' || id::text,
  ARRAY['read:public', 'read:community'],
  'authenticated',
  false
FROM profiles 
WHERE role = 'admin'
ON CONFLICT DO NOTHING;

-- Add comment to track migration
COMMENT ON TABLE api_keys IS 'API keys for public API access';
COMMENT ON TABLE api_usage_logs IS 'Logs all API requests for analytics and monitoring';
COMMENT ON TABLE webhooks IS 'Webhook endpoints for API integrations';
COMMENT ON TABLE webhook_deliveries IS 'Logs webhook delivery attempts and responses';