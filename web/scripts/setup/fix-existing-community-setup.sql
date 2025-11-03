-- Fix existing community setup
-- Run this if you're getting "already exists" errors

-- Update existing views with proper RLS settings
DROP VIEW IF EXISTS community_tips_with_stats CASCADE;
DROP VIEW IF EXISTS community_comments_with_stats CASCADE;

-- Recreate views with proper security settings
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

-- Create comments view if comments table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_tip_comments') THEN
    EXECUTE '
    CREATE VIEW community_comments_with_stats 
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
        COUNT(CASE WHEN vote_type = ''up'' THEN 1 END) as upvotes,
        COUNT(CASE WHEN vote_type = ''down'' THEN 1 END) as downvotes
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
    ';
  END IF;
END $$;

-- Grant permissions
GRANT SELECT ON community_tips_with_stats TO authenticated;
GRANT SELECT ON community_tips_with_stats TO anon;

-- Grant permissions for comments view if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.views WHERE table_name = 'community_comments_with_stats') THEN
    GRANT SELECT ON community_comments_with_stats TO authenticated;
    GRANT SELECT ON community_comments_with_stats TO anon;
  END IF;
END $$;

-- Ensure functions exist
CREATE OR REPLACE FUNCTION toggle_tip_vote(tip_uuid UUID, user_uuid UUID, new_vote_type TEXT)
RETURNS JSON AS $$
DECLARE
  existing_vote TEXT;
  result JSON;
BEGIN
  -- Get existing vote
  SELECT vote_type INTO existing_vote
  FROM community_tip_votes
  WHERE tip_id = tip_uuid AND user_id = user_uuid;
  
  IF existing_vote IS NULL THEN
    -- No existing vote, create new one
    INSERT INTO community_tip_votes (tip_id, user_id, vote_type)
    VALUES (tip_uuid, user_uuid, new_vote_type);
    
    result := json_build_object(
      'action', 'added',
      'vote_type', new_vote_type,
      'previous_vote', null
    );
  ELSIF existing_vote = new_vote_type THEN
    -- Same vote type, remove the vote (toggle off)
    DELETE FROM community_tip_votes
    WHERE tip_id = tip_uuid AND user_id = user_uuid;
    
    result := json_build_object(
      'action', 'removed',
      'vote_type', null,
      'previous_vote', existing_vote
    );
  ELSE
    -- Different vote type, update the vote
    UPDATE community_tip_votes
    SET vote_type = new_vote_type, updated_at = NOW()
    WHERE tip_id = tip_uuid AND user_id = user_uuid;
    
    result := json_build_object(
      'action', 'updated',
      'vote_type', new_vote_type,
      'previous_vote', existing_vote
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Community setup fixed successfully!' as status;