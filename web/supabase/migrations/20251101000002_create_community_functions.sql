-- Create user notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('vote', 'comment', 'mention', 'tip_featured', 'tip_verified', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_tip_id UUID REFERENCES community_tips(id) ON DELETE CASCADE,
    related_comment_id UUID REFERENCES community_tip_comments(id) ON DELETE CASCADE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON user_notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Function to get user community stats
CREATE OR REPLACE FUNCTION get_user_community_stats()
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    tips_created INTEGER,
    total_likes INTEGER,
    comments_posted INTEGER,
    helpful_votes INTEGER,
    total_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        COALESCE(tip_stats.tips_created, 0)::INTEGER as tips_created,
        COALESCE(tip_stats.total_likes, 0)::INTEGER as total_likes,
        COALESCE(comment_stats.comments_posted, 0)::INTEGER as comments_posted,
        COALESCE(vote_stats.helpful_votes, 0)::INTEGER as helpful_votes,
        (COALESCE(tip_stats.total_likes, 0) * 2 + 
         COALESCE(tip_stats.tips_created, 0) * 5 + 
         COALESCE(comment_stats.comments_posted, 0) * 1 + 
         COALESCE(vote_stats.helpful_votes, 0) * 3)::INTEGER as total_score
    FROM profiles p
    LEFT JOIN (
        SELECT 
            author_id,
            COUNT(*) as tips_created,
            SUM(likes) as total_likes
        FROM community_tips 
        GROUP BY author_id
    ) tip_stats ON p.id = tip_stats.author_id
    LEFT JOIN (
        SELECT 
            author_id,
            COUNT(*) as comments_posted
        FROM community_tip_comments 
        WHERE is_deleted = FALSE
        GROUP BY author_id
    ) comment_stats ON p.id = comment_stats.author_id
    LEFT JOIN (
        SELECT 
            ct.author_id,
            COUNT(*) as helpful_votes
        FROM community_tip_votes tv
        JOIN community_tips ct ON tv.tip_id = ct.id
        WHERE tv.vote_type = 'up'
        GROUP BY ct.author_id
    ) vote_stats ON p.id = vote_stats.author_id
    WHERE p.username IS NOT NULL
    ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get community leaderboard with period filter
CREATE OR REPLACE FUNCTION get_community_leaderboard(
    period_filter TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    tips_created INTEGER,
    total_likes INTEGER,
    comments_posted INTEGER,
    helpful_votes INTEGER,
    score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        COALESCE(tip_stats.tips_created, 0)::INTEGER as tips_created,
        COALESCE(tip_stats.total_likes, 0)::INTEGER as total_likes,
        COALESCE(comment_stats.comments_posted, 0)::INTEGER as comments_posted,
        COALESCE(vote_stats.helpful_votes, 0)::INTEGER as helpful_votes,
        (COALESCE(tip_stats.total_likes, 0) * 2 + 
         COALESCE(tip_stats.tips_created, 0) * 5 + 
         COALESCE(comment_stats.comments_posted, 0) * 1 + 
         COALESCE(vote_stats.helpful_votes, 0) * 3)::INTEGER as score
    FROM profiles p
    LEFT JOIN (
        SELECT 
            author_id,
            COUNT(*) as tips_created,
            SUM(likes) as total_likes
        FROM community_tips 
        WHERE period_filter IS NULL OR created_at >= period_filter
        GROUP BY author_id
    ) tip_stats ON p.id = tip_stats.author_id
    LEFT JOIN (
        SELECT 
            author_id,
            COUNT(*) as comments_posted
        FROM community_tip_comments 
        WHERE is_deleted = FALSE 
        AND (period_filter IS NULL OR created_at >= period_filter)
        GROUP BY author_id
    ) comment_stats ON p.id = comment_stats.author_id
    LEFT JOIN (
        SELECT 
            ct.author_id,
            COUNT(*) as helpful_votes
        FROM community_tip_votes tv
        JOIN community_tips ct ON tv.tip_id = ct.id
        WHERE tv.vote_type = 'up' 
        AND (period_filter IS NULL OR tv.created_at >= period_filter)
        GROUP BY ct.author_id
    ) vote_stats ON p.id = vote_stats.author_id
    WHERE p.username IS NOT NULL
    ORDER BY score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get helpful users leaderboard
CREATE OR REPLACE FUNCTION get_helpful_users_leaderboard(
    period_filter TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    helpful_votes INTEGER,
    tips_created INTEGER,
    total_likes INTEGER,
    score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        COALESCE(vote_stats.helpful_votes, 0)::INTEGER as helpful_votes,
        COALESCE(tip_stats.tips_created, 0)::INTEGER as tips_created,
        COALESCE(tip_stats.total_likes, 0)::INTEGER as total_likes,
        COALESCE(vote_stats.helpful_votes, 0)::INTEGER as score
    FROM profiles p
    LEFT JOIN (
        SELECT 
            ct.author_id,
            COUNT(*) as helpful_votes
        FROM community_tip_votes tv
        JOIN community_tips ct ON tv.tip_id = ct.id
        WHERE tv.vote_type = 'up' 
        AND (period_filter IS NULL OR tv.created_at >= period_filter)
        GROUP BY ct.author_id
    ) vote_stats ON p.id = vote_stats.author_id
    LEFT JOIN (
        SELECT 
            author_id,
            COUNT(*) as tips_created,
            SUM(likes) as total_likes
        FROM community_tips 
        WHERE period_filter IS NULL OR created_at >= period_filter
        GROUP BY author_id
    ) tip_stats ON p.id = tip_stats.author_id
    WHERE p.username IS NOT NULL AND vote_stats.helpful_votes > 0
    ORDER BY helpful_votes DESC, total_likes DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users leaderboard
CREATE OR REPLACE FUNCTION get_active_users_leaderboard(
    period_filter TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    comments_posted INTEGER,
    tips_created INTEGER,
    total_interactions INTEGER,
    score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        COALESCE(comment_stats.comments_posted, 0)::INTEGER as comments_posted,
        COALESCE(tip_stats.tips_created, 0)::INTEGER as tips_created,
        (COALESCE(comment_stats.comments_posted, 0) + COALESCE(tip_stats.tips_created, 0))::INTEGER as total_interactions,
        (COALESCE(comment_stats.comments_posted, 0) + COALESCE(tip_stats.tips_created, 0) * 2)::INTEGER as score
    FROM profiles p
    LEFT JOIN (
        SELECT 
            author_id,
            COUNT(*) as comments_posted
        FROM community_tip_comments 
        WHERE is_deleted = FALSE 
        AND (period_filter IS NULL OR created_at >= period_filter)
        GROUP BY author_id
    ) comment_stats ON p.id = comment_stats.author_id
    LEFT JOIN (
        SELECT 
            author_id,
            COUNT(*) as tips_created
        FROM community_tips 
        WHERE period_filter IS NULL OR created_at >= period_filter
        GROUP BY author_id
    ) tip_stats ON p.id = tip_stats.author_id
    WHERE p.username IS NOT NULL 
    AND (comment_stats.comments_posted > 0 OR tip_stats.tips_created > 0)
    ORDER BY total_interactions DESC, tips_created DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    target_user_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_message TEXT,
    tip_id UUID DEFAULT NULL,
    comment_id UUID DEFAULT NULL,
    url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id,
        type,
        title,
        message,
        related_tip_id,
        related_comment_id,
        action_url
    ) VALUES (
        target_user_id,
        notification_type,
        notification_title,
        notification_message,
        tip_id,
        comment_id,
        url
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notifications when tips are liked
CREATE OR REPLACE FUNCTION notify_tip_liked()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification for upvotes, not downvotes
    IF NEW.vote_type = 'up' THEN
        -- Get the tip author
        INSERT INTO user_notifications (user_id, type, title, message, related_tip_id)
        SELECT 
            ct.author_id,
            'tip_liked',
            'Your tip received a like!',
            'Someone liked your tip: ' || ct.title,
            ct.id
        FROM community_tips ct
        WHERE ct.id = NEW.tip_id 
        AND ct.author_id != NEW.user_id; -- Don't notify if user likes their own tip
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tip likes
DROP TRIGGER IF EXISTS trigger_notify_tip_liked ON community_tip_votes;
CREATE TRIGGER trigger_notify_tip_liked
    AFTER INSERT ON community_tip_votes
    FOR EACH ROW
    EXECUTE FUNCTION notify_tip_liked();

-- Trigger to create notifications when comments are added
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify tip author about new comment
    INSERT INTO user_notifications (user_id, type, title, message, related_tip_id, related_comment_id)
    SELECT 
        ct.author_id,
        'comment_added',
        'New comment on your tip',
        NEW.author_name || ' commented on your tip: ' || ct.title,
        ct.id,
        NEW.id
    FROM community_tips ct
    WHERE ct.id = NEW.tip_id 
    AND ct.author_id != NEW.author_id; -- Don't notify if author comments on their own tip
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comments
DROP TRIGGER IF EXISTS trigger_notify_comment_added ON community_tip_comments;
CREATE TRIGGER trigger_notify_comment_added
    AFTER INSERT ON community_tip_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_comment_added();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_community_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_leaderboard(TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_helpful_users_leaderboard(TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_users_leaderboard(TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT) TO authenticated;