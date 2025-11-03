-- Create community_tip_comments table
CREATE TABLE IF NOT EXISTS community_tip_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tip_id UUID REFERENCES community_tips(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'System',
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES community_tip_comments(id) ON DELETE CASCADE, -- For nested replies
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_comment_votes table for comment voting
CREATE TABLE IF NOT EXISTS community_comment_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES community_tip_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one vote per user per comment
  UNIQUE(comment_id, user_id)
);

-- Create tip bookmarks/favorites table
CREATE TABLE IF NOT EXISTS community_tip_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tip_id UUID REFERENCES community_tips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one bookmark per user per tip
  UNIQUE(tip_id, user_id)
);

-- Create tip reports table for moderation
CREATE TABLE IF NOT EXISTS community_tip_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tip_id UUID REFERENCES community_tips(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_tip_comments(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misinformation', 'harassment', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only report each item once
  UNIQUE(tip_id, reporter_id),
  UNIQUE(comment_id, reporter_id),
  
  -- Must have either tip_id or comment_id, but not both
  CHECK ((tip_id IS NOT NULL AND comment_id IS NULL) OR (tip_id IS NULL AND comment_id IS NOT NULL))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_tip_comments_tip_id ON community_tip_comments(tip_id);
CREATE INDEX IF NOT EXISTS idx_community_tip_comments_author ON community_tip_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_community_tip_comments_parent ON community_tip_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_tip_comments_created_at ON community_tip_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_community_comment_votes_comment_id ON community_comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_community_tip_bookmarks_user_id ON community_tip_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_community_tip_bookmarks_tip_id ON community_tip_bookmarks(tip_id);

-- Update the tips view to include comment counts
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
  WHERE is_deleted = FALSE
  GROUP BY tip_id
) comment_stats ON ct.id = comment_stats.tip_id
WHERE ct.is_deleted = FALSE;

-- Create view for comments with vote counts (replace if exists)
CREATE OR REPLACE VIEW community_comments_with_stats 
WITH (security_invoker = true) AS
SELECT 
  cc.*,
  COALESCE(vote_stats.upvotes, 0) as upvotes,
  COALESCE(vote_stats.downvotes, 0) as downvotes,
  COALESCE(vote_stats.upvotes, 0) - COALESCE(vote_stats.downvotes, 0) as net_votes,
  COALESCE(reply_stats.reply_count, 0) as reply_count
FROM community_tip_comments cc
LEFT JOIN (
  SELECT 
    comment_id,
    COUNT(CASE WHEN vote_type = 'up' THEN 1 END) as upvotes,
    COUNT(CASE WHEN vote_type = 'down' THEN 1 END) as downvotes
  FROM community_comment_votes
  GROUP BY comment_id
) vote_stats ON cc.id = vote_stats.comment_id
LEFT JOIN (
  SELECT 
    parent_comment_id,
    COUNT(*) as reply_count
  FROM community_tip_comments
  WHERE is_deleted = FALSE AND parent_comment_id IS NOT NULL
  GROUP BY parent_comment_id
) reply_stats ON cc.id = reply_stats.parent_comment_id
WHERE cc.is_deleted = FALSE;

-- Grant appropriate permissions on views
GRANT SELECT ON community_tips_with_stats TO authenticated;
GRANT SELECT ON community_tips_with_stats TO anon;
GRANT SELECT ON community_comments_with_stats TO authenticated;
GRANT SELECT ON community_comments_with_stats TO anon;

-- Function to toggle comment vote
CREATE OR REPLACE FUNCTION toggle_comment_vote(comment_uuid UUID, user_uuid UUID, new_vote_type TEXT)
RETURNS JSON AS $$
DECLARE
  existing_vote TEXT;
  result JSON;
BEGIN
  -- Get existing vote
  SELECT vote_type INTO existing_vote
  FROM community_comment_votes
  WHERE comment_id = comment_uuid AND user_id = user_uuid;
  
  IF existing_vote IS NULL THEN
    -- No existing vote, create new one
    INSERT INTO community_comment_votes (comment_id, user_id, vote_type)
    VALUES (comment_uuid, user_uuid, new_vote_type);
    
    result := json_build_object(
      'action', 'added',
      'vote_type', new_vote_type,
      'previous_vote', null
    );
  ELSIF existing_vote = new_vote_type THEN
    -- Same vote type, remove the vote (toggle off)
    DELETE FROM community_comment_votes
    WHERE comment_id = comment_uuid AND user_id = user_uuid;
    
    result := json_build_object(
      'action', 'removed',
      'vote_type', null,
      'previous_vote', existing_vote
    );
  ELSE
    -- Different vote type, update the vote
    UPDATE community_comment_votes
    SET vote_type = new_vote_type
    WHERE comment_id = comment_uuid AND user_id = user_uuid;
    
    result := json_build_object(
      'action', 'updated',
      'vote_type', new_vote_type,
      'previous_vote', existing_vote
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle bookmark
CREATE OR REPLACE FUNCTION toggle_tip_bookmark(tip_uuid UUID, user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  existing_bookmark BOOLEAN;
  result JSON;
BEGIN
  -- Check if bookmark exists
  SELECT TRUE INTO existing_bookmark
  FROM community_tip_bookmarks
  WHERE tip_id = tip_uuid AND user_id = user_uuid;
  
  IF existing_bookmark IS NULL THEN
    -- No existing bookmark, create one
    INSERT INTO community_tip_bookmarks (tip_id, user_id)
    VALUES (tip_uuid, user_uuid);
    
    result := json_build_object(
      'action', 'bookmarked',
      'bookmarked', true
    );
  ELSE
    -- Bookmark exists, remove it
    DELETE FROM community_tip_bookmarks
    WHERE tip_id = tip_uuid AND user_id = user_uuid;
    
    result := json_build_object(
      'action', 'unbookmarked',
      'bookmarked', false
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE community_tip_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_tip_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_tip_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
DROP POLICY IF EXISTS "Anyone can view non-deleted comments" ON community_tip_comments;
CREATE POLICY "Anyone can view non-deleted comments" ON community_tip_comments
  FOR SELECT USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "Users can create comments" ON community_tip_comments;
CREATE POLICY "Users can create comments" ON community_tip_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON community_tip_comments;
CREATE POLICY "Users can update their own comments" ON community_tip_comments
  FOR UPDATE USING (auth.uid() = author_id);

-- RLS Policies for comment votes
DROP POLICY IF EXISTS "Users can view all comment votes" ON community_comment_votes;
CREATE POLICY "Users can view all comment votes" ON community_comment_votes
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can manage their own comment votes" ON community_comment_votes;
CREATE POLICY "Users can manage their own comment votes" ON community_comment_votes
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for bookmarks
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON community_tip_bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON community_tip_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON community_tip_bookmarks;
CREATE POLICY "Users can manage their own bookmarks" ON community_tip_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for reports
DROP POLICY IF EXISTS "Users can view their own reports" ON community_tip_reports;
CREATE POLICY "Users can view their own reports" ON community_tip_reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can create reports" ON community_tip_reports;
CREATE POLICY "Users can create reports" ON community_tip_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Add some sample comments to existing tips
DO $$
DECLARE
  tip_record RECORD;
  user_record RECORD;
  comment_id UUID;
BEGIN
  -- Get first few tips and users for sample comments
  FOR tip_record IN SELECT id FROM community_tips LIMIT 3 LOOP
    FOR user_record IN SELECT id FROM auth.users LIMIT 2 LOOP
      -- Add a main comment
      INSERT INTO community_tip_comments (tip_id, author_id, author_name, content)
      VALUES (
        tip_record.id, 
        user_record.id, 
        'System',
        CASE 
          WHEN random() < 0.5 THEN 'This really works! Thanks for sharing.'
          ELSE 'Great tip, I''ll definitely try this approach.'
        END
      )
      RETURNING id INTO comment_id;
      
      -- Sometimes add a reply
      IF random() < 0.3 THEN
        INSERT INTO community_tip_comments (tip_id, author_id, author_name, content, parent_comment_id)
        VALUES (
          tip_record.id,
          user_record.id,
          'System',
          'Agreed! This has been a game changer for me too.',
          comment_id
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy for admin audit log (only admins can view)
DROP POLICY IF EXISTS "Only admins can view audit log" ON admin_audit_log;
CREATE POLICY "Only admins can view audit log" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);