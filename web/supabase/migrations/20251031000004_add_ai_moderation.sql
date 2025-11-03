-- Add AI moderation system tables and columns

-- Add moderation columns to community_tips table
ALTER TABLE community_tips 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'flagged', 'rejected', 'pending')),
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Add moderation columns to community_tip_comments table (some may already exist)
ALTER TABLE community_tip_comments 
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'flagged', 'rejected', 'pending')),
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Create AI moderation log table
CREATE TABLE IF NOT EXISTS ai_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('tip', 'comment')),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'flagged', 'rejected')),
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  flags TEXT[] DEFAULT '{}',
  reasoning TEXT,
  is_spam BOOLEAN DEFAULT FALSE,
  is_inappropriate BOOLEAN DEFAULT FALSE,
  is_off_topic BOOLEAN DEFAULT FALSE,
  is_medical_misinformation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_content_id ON ai_moderation_log(content_id);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_content_type ON ai_moderation_log(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_action ON ai_moderation_log(action);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_created_at ON ai_moderation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_log_author_id ON ai_moderation_log(author_id);

-- Create indexes for moderation status on main tables
CREATE INDEX IF NOT EXISTS idx_community_tips_moderation_status ON community_tips(moderation_status);
CREATE INDEX IF NOT EXISTS idx_community_tips_is_flagged ON community_tips(is_flagged);
CREATE INDEX IF NOT EXISTS idx_community_tip_comments_moderation_status ON community_tip_comments(moderation_status);

-- Enable RLS on AI moderation log
ALTER TABLE ai_moderation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy for AI moderation log (only admins can view)
DROP POLICY IF EXISTS "Only admins can view AI moderation log" ON ai_moderation_log;
CREATE POLICY "Only admins can view AI moderation log" ON ai_moderation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow system (service role) to insert moderation logs
DROP POLICY IF EXISTS "System can insert moderation logs" ON ai_moderation_log;
CREATE POLICY "System can insert moderation logs" ON ai_moderation_log
  FOR INSERT WITH CHECK (true);

-- Update the tips view to include moderation status
DROP VIEW IF EXISTS community_tips_with_stats;
CREATE VIEW community_tips_with_stats 
WITH (security_invoker = true) AS
SELECT 
  ct.*,
  COALESCE(vote_stats.upvotes, 0) as upvotes,
  COALESCE(vote_stats.downvotes, 0) as downvotes,
  COALESCE(vote_stats.upvotes, 0) - COALESCE(vote_stats.downvotes, 0) as net_votes,
  COALESCE(comment_stats.comment_count, 0) as comment_count
FROM community_tips ct
LEFT JOIN (
  SELECT 
    tip_id,
    COUNT(CASE WHEN vote_type = 'up' THEN 1 END) as upvotes,
    COUNT(CASE WHEN vote_type = 'down' THEN 1 END) as downvotes
  FROM community_tip_votes
  GROUP BY tip_id
) vote_stats ON ct.id = vote_stats.tip_id
LEFT JOIN (
  SELECT 
    tip_id,
    COUNT(*) as comment_count
  FROM community_tip_comments
  WHERE is_deleted = FALSE AND moderation_status != 'rejected'
  GROUP BY tip_id
) comment_stats ON ct.id = comment_stats.tip_id
WHERE ct.is_deleted = FALSE AND ct.moderation_status != 'rejected';

-- Grant permissions on the updated view
GRANT SELECT ON community_tips_with_stats TO authenticated;
GRANT SELECT ON community_tips_with_stats TO anon;

-- Create RPC function to get AI moderation statistics
CREATE OR REPLACE FUNCTION get_ai_moderation_stats(days_back INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  since_date TIMESTAMP WITH TIME ZONE;
BEGIN
  since_date := NOW() - (days_back || ' days')::INTERVAL;
  
  SELECT json_build_object(
    'total_moderated', COUNT(*),
    'approved', COUNT(*) FILTER (WHERE action = 'approved'),
    'flagged', COUNT(*) FILTER (WHERE action = 'flagged'),
    'rejected', COUNT(*) FILTER (WHERE action = 'rejected'),
    'avg_confidence', ROUND(AVG(confidence_score)),
    'avg_quality', ROUND(AVG(quality_score)),
    'spam_detected', COUNT(*) FILTER (WHERE is_spam = true),
    'inappropriate_detected', COUNT(*) FILTER (WHERE is_inappropriate = true),
    'off_topic_detected', COUNT(*) FILTER (WHERE is_off_topic = true),
    'misinformation_detected', COUNT(*) FILTER (WHERE is_medical_misinformation = true),
    'by_content_type', json_build_object(
      'tips', COUNT(*) FILTER (WHERE content_type = 'tip'),
      'comments', COUNT(*) FILTER (WHERE content_type = 'comment')
    )
  ) INTO result
  FROM ai_moderation_log
  WHERE created_at >= since_date;
  
  RETURN result;
END;
$$;