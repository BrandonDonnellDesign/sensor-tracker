-- Migration: Create system_logs table for security and system event logging
-- Created: 2025-10-30
-- Description: Adds system_logs table to track security events, admin actions, and system errors

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  user_hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_hash ON system_logs(user_hash);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_level ON system_logs(category, level);

-- Enable RLS (Row Level Security)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all logs
CREATE POLICY "Service role can manage system logs" ON system_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Create policy to allow authenticated users to read their own logs
CREATE POLICY "Users can read their own logs" ON system_logs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    user_hash = CONCAT('user_', SUBSTRING(auth.uid()::text, 1, 8))
  );

-- Grant necessary permissions
GRANT ALL ON system_logs TO service_role;
GRANT SELECT ON system_logs TO authenticated;

-- Add table comment
COMMENT ON TABLE system_logs IS 'System and security event logging table for audit trails and monitoring';
COMMENT ON COLUMN system_logs.level IS 'Log level: info, warn, or error';
COMMENT ON COLUMN system_logs.category IS 'Log category: security, system, admin, etc.';
COMMENT ON COLUMN system_logs.message IS 'Human-readable log message';
COMMENT ON COLUMN system_logs.user_hash IS 'Hashed user identifier for privacy';
COMMENT ON COLUMN system_logs.metadata IS 'Additional structured data as JSON';