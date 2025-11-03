-- Add moderated_at column to community_tips table to match comments table
ALTER TABLE community_tips 
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);

-- Create index for moderation queries on tips
CREATE INDEX IF NOT EXISTS idx_community_tips_moderated_at ON community_tips(moderated_at);

-- Add some test flagged content for admin moderation testing

-- Insert a flagged tip
INSERT INTO community_tips (
  title, 
  content, 
  category, 
  author_name, 
  moderation_status, 
  moderation_reason,
  is_flagged
) VALUES (
  'This tip might be problematic',
  'This content contains some questionable advice that needs admin review before being approved.',
  'general',
  'Test User',
  'flagged',
  'Potentially misleading medical advice detected',
  true
);

-- Insert a flagged comment (if the comments table exists)
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_tip_comments') THEN
    INSERT INTO community_tip_comments (
      content,
      author_name,
      tip_id,
      moderation_status,
      moderation_reason
    ) VALUES (
      'This comment also needs review by an admin.',
      'Another Test User',
      (SELECT id FROM community_tips LIMIT 1),
      'flagged',
      'Spam-like content detected'
    );
  END IF;
END $;