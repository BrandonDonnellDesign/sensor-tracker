-- Rollback Helper Scripts
-- Safe rollback utilities for common migration issues

\echo 'Rollback helpers loaded. Use with caution!'

-- Function to safely drop table if exists
CREATE OR REPLACE FUNCTION safe_drop_table(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
  RAISE NOTICE 'Dropped table % if it existed', table_name;
END;
$$ LANGUAGE plpgsql;

-- Function to safely drop function if exists
CREATE OR REPLACE FUNCTION safe_drop_function(function_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', function_name);
  RAISE NOTICE 'Dropped function % if it existed', function_name;
END;
$$ LANGUAGE plpgsql;

-- Function to safely drop trigger if exists
CREATE OR REPLACE FUNCTION safe_drop_trigger(trigger_name text, table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_name);
  RAISE NOTICE 'Dropped trigger % on table % if it existed', trigger_name, table_name;
END;
$$ LANGUAGE plpgsql;

-- Emergency rollback for community features
CREATE OR REPLACE FUNCTION rollback_community_features()
RETURNS void AS $$
BEGIN
  -- Drop community tables in reverse dependency order
  PERFORM safe_drop_table('activity_feed');
  PERFORM safe_drop_table('notifications');
  PERFORM safe_drop_table('community_votes');
  PERFORM safe_drop_table('community_comments');
  PERFORM safe_drop_table('community_tips');
  
  -- Drop community functions
  PERFORM safe_drop_function('update_community_stats');
  PERFORM safe_drop_function('create_activity_entry');
  PERFORM safe_drop_function('send_notification');
  
  RAISE NOTICE 'Community features rolled back successfully';
END;
$$ LANGUAGE plpgsql;

-- Emergency rollback for Dexcom auto-refresh
CREATE OR REPLACE FUNCTION rollback_dexcom_auto_refresh()
RETURNS void AS $$
BEGIN
  -- Drop auto-refresh components
  PERFORM safe_drop_function('refresh_expired_dexcom_tokens');
  PERFORM safe_drop_function('schedule_token_refresh');
  PERFORM safe_drop_table('dexcom_refresh_log');
  
  -- Remove auto-refresh columns from dexcom_tokens if they exist
  ALTER TABLE dexcom_tokens DROP COLUMN IF EXISTS auto_refresh_enabled;
  ALTER TABLE dexcom_tokens DROP COLUMN IF EXISTS last_refresh_attempt;
  ALTER TABLE dexcom_tokens DROP COLUMN IF EXISTS refresh_count;
  
  RAISE NOTICE 'Dexcom auto-refresh rolled back successfully';
END;
$$ LANGUAGE plpgsql;

\echo 'Rollback helpers ready. Use rollback_community_features() or rollback_dexcom_auto_refresh() if needed.'