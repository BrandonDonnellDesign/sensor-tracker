-- Apply All Migrations Script
-- Consolidated script to apply all migrations in correct order
-- Run this after fresh database setup

\echo 'Starting migration application...'

-- Core migrations (in chronological order)
\i ../supabase/migrations/20251030000011_fix_web_vitals_constraints.sql
\i ../supabase/migrations/20251030000012_comprehensive_security_functions.sql
\i ../supabase/migrations/20251031000001_create_community_tips_and_votes.sql
\i ../supabase/migrations/20251031000002_add_comments_and_features.sql
\i ../supabase/migrations/20251031000003_add_comment_moderation.sql
\i ../supabase/migrations/20251031000004_add_ai_moderation.sql
\i ../supabase/migrations/20251031000005_add_email_notifications.sql
\i ../supabase/migrations/20251101000001_create_api_authentication.sql
\i ../supabase/migrations/20251101000002_create_community_functions.sql
\i ../supabase/migrations/20251101000003_add_dexcom_auto_refresh.sql
\i ../supabase/migrations/20251101000004_fix_dexcom_sync_log_table.sql
\i ../supabase/migrations/20251101000005_fix_dexcom_sync_log_structure.sql
\i ../supabase/migrations/20251101000006_fix_auto_refresh_functions.sql

\echo 'All migrations applied successfully!'
\echo 'Next steps:'
\echo '1. Run setup/admin-setup.sql to configure admin users'
\echo '2. Run setup/sample-data.sql for development data'
\echo '3. Run testing/validate-setup.js to verify installation'