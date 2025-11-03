-- Add moderation columns to community_tip_comments table
ALTER TABLE community_tip_comments 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);

-- Create index for moderation queries
CREATE INDEX IF NOT EXISTS idx_community_tip_comments_moderation 
ON community_tip_comments(is_approved, is_rejected, moderated_at);

-- Update the comments view to include moderation status
DROP VIEW IF EXISTS community_comments_with_stats;
CREATE OR REPLACE VIEW community_comments_with_stats 
WITH (security_invoker = true) AS
SELECT 
  cc.*,
  COALESCE(vote_stats.upvotes, 0) as upvotes,
  COALESCE(vote_stats.downvotes, 0) as downvotes,
  COALESCE(vote_stats.upvotes, 0) - COALESCE(vote_stats.downvotes, 0) as net_votes,
  COALESCE(reply_stats.reply_count, 0) as reply_count,
  moderator.email as moderator_email
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
LEFT JOIN auth.users moderator ON cc.moderated_by = moderator.id
WHERE cc.is_deleted = FALSE;

-- Grant permissions on the updated view
GRANT SELECT ON community_comments_with_stats TO authenticated;
GRANT SELECT ON community_comments_with_stats TO anon;

-- Create RPC function to get audit logs with user information
CREATE OR REPLACE FUNCTION get_admin_audit_logs_with_user_info(log_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  admin_id UUID,
  admin_email TEXT,
  admin_username TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.id,
    aal.action,
    aal.resource_type,
    aal.resource_id,
    aal.details,
    aal.created_at,
    aal.admin_id,
    COALESCE(au.email, 'No Email Set') as admin_email,
    COALESCE(
      p.username, 
      p.full_name, 
      CASE 
        WHEN au.email IS NOT NULL THEN split_part(au.email, '@', 1)
        ELSE CONCAT('User-', SUBSTRING(aal.admin_id::text, 1, 8))
      END
    ) as admin_username
  FROM admin_audit_log aal
  LEFT JOIN profiles p ON aal.admin_id = p.id
  LEFT JOIN auth.users au ON aal.admin_id = au.id
  ORDER BY aal.created_at DESC
  LIMIT log_limit;
END;
$$;

-- Update the handle_new_user function to keep it simple since email is in auth.users
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (new.id);
    RETURN new;
END;
$$;