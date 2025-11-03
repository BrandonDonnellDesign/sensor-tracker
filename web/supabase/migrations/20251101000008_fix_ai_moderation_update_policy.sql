-- Add missing UPDATE policy for AI moderation log
-- This allows admins to update AI moderation log entries (approve/reject flagged content)

DROP POLICY IF EXISTS "Admins can update AI moderation log" ON ai_moderation_log;
CREATE POLICY "Admins can update AI moderation log" ON ai_moderation_log
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );