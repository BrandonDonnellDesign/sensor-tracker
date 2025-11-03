-- Database Optimization Script
-- Consolidates vacuum-commands.sql and other optimization tasks

\echo 'Starting database optimization...'

-- Vacuum and analyze all tables
VACUUM ANALYZE;

-- Specific table optimizations
VACUUM ANALYZE public.profiles;
VACUUM ANALYZE public.glucose_readings;
VACUUM ANALYZE public.community_tips;
VACUUM ANALYZE public.community_comments;
VACUUM ANALYZE public.community_votes;
VACUUM ANALYZE public.dexcom_tokens;
VACUUM ANALYZE public.notifications;
VACUUM ANALYZE public.activity_feed;

-- Reindex for performance
REINDEX DATABASE postgres;

-- Update table statistics
ANALYZE;

\echo 'Database optimization completed!'
\echo 'Performance improvements applied to all tables.'