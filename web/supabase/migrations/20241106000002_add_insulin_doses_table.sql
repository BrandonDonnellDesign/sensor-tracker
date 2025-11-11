-- Create insulin_doses table for IOB tracking
CREATE TABLE IF NOT EXISTS insulin_doses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dose DECIMAL(4,1) NOT NULL CHECK (dose > 0 AND dose <= 50),
  insulin_type TEXT NOT NULL CHECK (insulin_type IN ('rapid', 'short', 'intermediate', 'long')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE insulin_doses ENABLE ROW LEVEL SECURITY;

-- Users can only access their own insulin doses
CREATE POLICY "Users can view own insulin doses" ON insulin_doses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insulin doses" ON insulin_doses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insulin doses" ON insulin_doses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insulin doses" ON insulin_doses
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_insulin_doses_user_timestamp ON insulin_doses(user_id, timestamp DESC);
CREATE INDEX idx_insulin_doses_meal ON insulin_doses(meal_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_insulin_doses_updated_at 
  BEFORE UPDATE ON insulin_doses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();