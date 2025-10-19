-- Create feedback table for user feedback and feature requests
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('feature', 'bug', 'improvement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'sensors', 'analytics', 'integrations', 'ui', 'performance')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'rejected')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  admin_notes TEXT,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view all feedback (for transparency)
CREATE POLICY "Anyone can view feedback" ON feedback
  FOR SELECT USING (true);

-- Users can insert their own feedback
CREATE POLICY "Users can submit feedback" ON feedback
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Users can update their own feedback (within 24 hours)
CREATE POLICY "Users can update own feedback" ON feedback
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    created_at > NOW() - INTERVAL '24 hours'
  );

-- Admins can do everything (we'll handle this in the admin interface)
CREATE POLICY "Admins can manage all feedback" ON feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_feedback_updated_at_trigger
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- Insert some sample feedback data
INSERT INTO feedback (type, title, description, priority, category, status, user_email)
VALUES
  ('feature', 'Dark mode for mobile app', 'Would love to have a dark mode option in the mobile interface for better nighttime viewing', 'medium', 'ui', 'planned', 'test@example.com'),
  ('improvement', 'Faster OCR processing', 'OCR sometimes takes a while to process sensor photos. Could this be optimized?', 'high', 'performance', 'in_progress', 'test@example.com'),
  ('feature', 'Export data to CSV', 'Ability to export sensor data and analytics to CSV format for external analysis', 'medium', 'analytics', 'submitted', 'test@example.com'),
  ('bug', 'Notification timing issues', 'Sometimes I get sensor expiry notifications after I have already changed the sensor', 'high', 'integrations', 'reviewing', 'test@example.com'),
  ('feature', 'Apple Health integration', 'Integration with Apple Health to sync glucose data automatically', 'high', 'integrations', 'planned', 'test@example.com'),
  ('improvement', 'Better sensor search', 'Search functionality could be improved with filters by date range and sensor type', 'low', 'sensors', 'submitted', 'test@example.com'),
  ('feature', 'Medication tracking', 'Track insulin doses and other diabetes medications alongside sensor data', 'medium', 'general', 'submitted', 'test@example.com'),
  ('improvement', 'Dashboard customization', 'Allow users to customize which widgets appear on their dashboard', 'medium', 'ui', 'planned', 'test@example.com');

-- Add comment to table
COMMENT ON TABLE feedback IS 'User feedback, feature requests, and bug reports';
COMMENT ON COLUMN feedback.type IS 'Type of feedback: feature request, bug report, or improvement suggestion';
COMMENT ON COLUMN feedback.status IS 'Current status of the feedback item';
COMMENT ON COLUMN feedback.votes IS 'Number of user votes/upvotes for this feedback item';
COMMENT ON COLUMN feedback.admin_notes IS 'Internal notes from administrators';