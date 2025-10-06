-- Admin System Tables Migration
-- Creates tables for admin functionality: system logs, feature flags, admin notes

-- 1. System logs table for audit trail and debugging
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  category text NOT NULL, -- 'auth', 'sensors', 'ocr', 'dexcom', 'notifications'
  message text NOT NULL,
  user_hash text, -- SHA256 hash of user ID for privacy
  metadata jsonb -- Additional structured data
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);

-- RLS for system logs (admin only)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 2. Feature flags table for remote config
CREATE TABLE IF NOT EXISTS feature_flags (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for feature flags (read-only for users, admin-only writes)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Public read policy for feature flags
CREATE POLICY "feature_flags_read_all" ON feature_flags
  FOR SELECT USING (true);

-- Insert some default feature flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
  ('glucose_charts', 'Glucose Charts', 'Display glucose trend charts in dashboard', true, 100),
  ('smart_archive', 'Smart Archive', 'Auto-archive old sensors based on ML predictions', false, 0),
  ('dexcom_integration', 'Dexcom Integration', 'Connect with Dexcom API for automatic data sync', true, 25),
  ('advanced_ocr', 'Advanced OCR', 'Use enhanced OCR engine for better accuracy', false, 10)
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at (reuse existing function if available)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_feature_flags_updated_at'
  ) THEN
    CREATE TRIGGER update_feature_flags_updated_at
      BEFORE UPDATE ON feature_flags
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 3. Admin notes table for operational notes
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  content text,
  category text, -- 'maintenance', 'incident', 'feature', 'user-support'
  resolved boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON admin_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notes_resolved ON admin_notes(resolved);

-- RLS for admin notes (admin only)
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;