-- Create table for tracking OpenFoodFacts submissions
CREATE TABLE IF NOT EXISTS openfoodfacts_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  product_name TEXT,
  submission_status TEXT NOT NULL CHECK (submission_status IN ('success', 'failed', 'pending')),
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_submissions_user_id ON openfoodfacts_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_submissions_barcode ON openfoodfacts_submissions(barcode);
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_submissions_status ON openfoodfacts_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_openfoodfacts_submissions_created_at ON openfoodfacts_submissions(created_at);

-- Enable RLS
ALTER TABLE openfoodfacts_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own OpenFoodFacts submissions" ON openfoodfacts_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OpenFoodFacts submissions" ON openfoodfacts_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OpenFoodFacts submissions" ON openfoodfacts_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_openfoodfacts_submissions_updated_at 
  BEFORE UPDATE ON openfoodfacts_submissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();