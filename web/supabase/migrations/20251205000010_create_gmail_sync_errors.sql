-- Create table for Gmail sync error logging
CREATE TABLE IF NOT EXISTS gmail_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('email_parsing', 'order_matching', 'inventory_update', 'gmail_api', 'database', 'unknown')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  email_id TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_gmail_sync_errors_user_id ON gmail_sync_errors(user_id);
CREATE INDEX idx_gmail_sync_errors_created_at ON gmail_sync_errors(created_at DESC);
CREATE INDEX idx_gmail_sync_errors_category ON gmail_sync_errors(category);
CREATE INDEX idx_gmail_sync_errors_severity ON gmail_sync_errors(severity);
CREATE INDEX idx_gmail_sync_errors_email_id ON gmail_sync_errors(email_id) WHERE email_id IS NOT NULL;

-- Enable RLS
ALTER TABLE gmail_sync_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sync errors"
  ON gmail_sync_errors
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sync errors"
  ON gmail_sync_errors
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own sync errors"
  ON gmail_sync_errors
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to cleanup old errors (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_gmail_sync_errors()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM gmail_sync_errors
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create table for tracking unmatched emails (for admin review)
CREATE TABLE IF NOT EXISTS unmatched_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  vendor TEXT NOT NULL,
  subject TEXT,
  parsed_data JSONB,
  email_date TIMESTAMPTZ,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for unmatched emails
CREATE INDEX idx_unmatched_emails_user_id ON unmatched_emails(user_id);
CREATE INDEX idx_unmatched_emails_reviewed ON unmatched_emails(reviewed);
CREATE INDEX idx_unmatched_emails_vendor ON unmatched_emails(vendor);
CREATE INDEX idx_unmatched_emails_created_at ON unmatched_emails(created_at DESC);

-- Enable RLS
ALTER TABLE unmatched_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own unmatched emails"
  ON unmatched_emails
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert unmatched emails"
  ON unmatched_emails
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own unmatched emails"
  ON unmatched_emails
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin policy (users with role 'admin' can see all)
CREATE POLICY "Admins can view all unmatched emails"
  ON unmatched_emails
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to get sync error statistics
CREATE OR REPLACE FUNCTION get_sync_error_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_errors BIGINT,
  critical_count BIGINT,
  error_count BIGINT,
  warning_count BIGINT,
  info_count BIGINT,
  parsing_errors BIGINT,
  matching_errors BIGINT,
  inventory_errors BIGINT,
  api_errors BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT as critical_count,
    COUNT(*) FILTER (WHERE severity = 'error')::BIGINT as error_count,
    COUNT(*) FILTER (WHERE severity = 'warning')::BIGINT as warning_count,
    COUNT(*) FILTER (WHERE severity = 'info')::BIGINT as info_count,
    COUNT(*) FILTER (WHERE category = 'email_parsing')::BIGINT as parsing_errors,
    COUNT(*) FILTER (WHERE category = 'order_matching')::BIGINT as matching_errors,
    COUNT(*) FILTER (WHERE category = 'inventory_update')::BIGINT as inventory_errors,
    COUNT(*) FILTER (WHERE category = 'gmail_api')::BIGINT as api_errors
  FROM gmail_sync_errors
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

COMMENT ON TABLE gmail_sync_errors IS 'Tracks errors during Gmail sync operations for debugging and monitoring';
COMMENT ON TABLE unmatched_emails IS 'Stores emails that could not be matched to orders for manual review';
