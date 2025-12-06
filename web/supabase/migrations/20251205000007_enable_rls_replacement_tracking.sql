-- Enable RLS on replacement_tracking table
ALTER TABLE replacement_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for replacement_tracking
DROP POLICY IF EXISTS "Users can view their own replacement tracking" ON replacement_tracking;
CREATE POLICY "Users can view their own replacement tracking" 
ON replacement_tracking
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own replacement tracking" ON replacement_tracking;
CREATE POLICY "Users can insert their own replacement tracking" 
ON replacement_tracking
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own replacement tracking" ON replacement_tracking;
CREATE POLICY "Users can update their own replacement tracking" 
ON replacement_tracking
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own replacement tracking" ON replacement_tracking;
CREATE POLICY "Users can delete their own replacement tracking" 
ON replacement_tracking
FOR DELETE 
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON replacement_tracking TO authenticated;
