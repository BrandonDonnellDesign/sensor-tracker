-- Web Vitals and Performance Monitoring Tables
-- Run this migration to set up performance tracking

-- Web Vitals tracking table
CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('CLS', 'INP', 'FCP', 'LCP', 'TTFB')),
  metric_value NUMERIC NOT NULL,
  metric_id TEXT NOT NULL,
  metric_delta NUMERIC,
  metric_rating TEXT CHECK (metric_rating IN ('good', 'needs-improvement', 'poor')),
  user_agent TEXT,
  page_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User analytics events table
CREATE TABLE IF NOT EXISTS user_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_properties JSONB,
  page_url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance issues tracking
CREATE TABLE IF NOT EXISTS performance_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  issue_details JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT FALSE,
  page_url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_web_vitals_timestamp ON web_vitals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON web_vitals(metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_user_id ON web_vitals(user_id);
CREATE INDEX IF NOT EXISTS idx_web_vitals_rating ON web_vitals(metric_rating);

CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_name ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);

CREATE INDEX IF NOT EXISTS idx_performance_issues_timestamp ON performance_issues(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_issues_type ON performance_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_performance_issues_severity ON performance_issues(severity);
CREATE INDEX IF NOT EXISTS idx_performance_issues_resolved ON performance_issues(resolved);

-- Row Level Security (RLS) policies
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_issues ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own web vitals" ON web_vitals;
DROP POLICY IF EXISTS "Users can insert their own events" ON user_events;
DROP POLICY IF EXISTS "Users can insert their own performance issues" ON performance_issues;
DROP POLICY IF EXISTS "Admins can read all web vitals" ON web_vitals;
DROP POLICY IF EXISTS "Admins can read all user events" ON user_events;
DROP POLICY IF EXISTS "Admins can read all performance issues" ON performance_issues;

-- Allow users to insert their own data
CREATE POLICY "Users can insert their own web vitals" ON web_vitals
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own events" ON user_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own performance issues" ON performance_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admin users can read all data (adjust this based on your admin setup)
CREATE POLICY "Admins can read all web vitals" ON web_vitals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read all user events" ON user_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read all performance issues" ON performance_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Drop existing view if it exists and create a new one
DROP VIEW IF EXISTS performance_summary;
CREATE VIEW performance_summary AS
SELECT 
  metric_name,
  COUNT(*) as total_measurements,
  AVG(metric_value) as avg_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value,
  COUNT(CASE WHEN metric_rating = 'good' THEN 1 END) * 100.0 / COUNT(*) as good_percentage,
  COUNT(CASE WHEN metric_rating = 'needs-improvement' THEN 1 END) * 100.0 / COUNT(*) as needs_improvement_percentage,
  COUNT(CASE WHEN metric_rating = 'poor' THEN 1 END) * 100.0 / COUNT(*) as poor_percentage,
  DATE_TRUNC('day', timestamp) as date
FROM web_vitals 
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY metric_name, DATE_TRUNC('day', timestamp)
ORDER BY date DESC, metric_name;