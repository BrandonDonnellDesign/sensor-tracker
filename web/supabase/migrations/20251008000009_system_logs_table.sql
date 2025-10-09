-- Create system_logs table for monitoring system events
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  user_hash VARCHAR(12), -- Hashed user ID for privacy
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON public.system_logs(category);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only admins can access system logs)
CREATE POLICY "Only admins can view system logs" ON public.system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

CREATE POLICY "Only admins can insert system logs" ON public.system_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- Function to log system events
CREATE OR REPLACE FUNCTION log_system_event(
  p_level VARCHAR(10),
  p_category VARCHAR(50),
  p_message TEXT,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  user_hash_value VARCHAR(12);
BEGIN
  -- Hash user ID if provided
  IF p_user_id IS NOT NULL THEN
    user_hash_value := LEFT(encode(digest(p_user_id::text, 'sha256'), 'hex'), 12);
  END IF;

  -- Insert log entry
  INSERT INTO public.system_logs (level, category, message, user_hash, metadata)
  VALUES (p_level, p_category, p_message, user_hash_value, p_metadata)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample system logs to demonstrate functionality
INSERT INTO public.system_logs (level, category, message, metadata) VALUES
('info', 'system', 'System logs table created and initialized', '{"version": "1.0", "migration": "20251008000009"}'),
('info', 'system', 'Database migration completed successfully', '{"migration": "system_logs_setup"}'),
('info', 'monitoring', 'System monitoring activated', '{"features": ["logs", "metrics", "health_checks"]}'),
('info', 'system', 'System logs migration completed successfully', '{"migration": "20251008000009"}');