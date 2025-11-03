-- Cleanup Old Data Script
-- Consolidates various cleanup and maintenance tasks

\echo 'Starting data cleanup...'

-- Clean up old notifications (older than 30 days)
DELETE FROM public.notifications 
WHERE created_at < NOW() - INTERVAL '30 days' 
AND is_read = true;

-- Clean up old activity feed entries (older than 90 days)
DELETE FROM public.activity_feed 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean up expired Dexcom tokens
DELETE FROM public.dexcom_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days';

-- Clean up flagged/rejected community content (older than 30 days)
DELETE FROM public.community_tips 
WHERE moderation_status IN ('flagged', 'rejected') 
AND created_at < NOW() - INTERVAL '30 days';

-- Clean up orphaned comments (where parent tip was deleted)
DELETE FROM public.community_comments 
WHERE tip_id NOT IN (SELECT id FROM public.community_tips);

-- Clean up orphaned votes (where parent tip was deleted)
DELETE FROM public.community_votes 
WHERE tip_id NOT IN (SELECT id FROM public.community_tips);

-- Update statistics
ANALYZE;

\echo 'Data cleanup completed!'
\echo 'Old and orphaned data has been removed.'