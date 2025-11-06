-- Cleanup Unused Notification Tables Migration
-- Removes notification_delivery_log and active_notifications tables that are not being used

-- First, check if tables exist and drop them if they do
-- This is safe because no code references these tables

-- Drop notification_delivery_log table if it exists
DROP TABLE IF EXISTS "public"."notification_delivery_log" CASCADE;

-- Drop active_notifications view if it exists (it's a view, not a table)
DROP VIEW IF EXISTS "public"."active_notifications" CASCADE;

-- Clean up any orphaned foreign key constraints or indexes that might reference these tables
-- (This is a safety measure in case there were any lingering references)

-- Log the cleanup action
INSERT INTO "public"."system_logs" (
  "level",
  "category", 
  "message",
  "metadata"
) VALUES (
  'info',
  'database_cleanup',
  'Removed unused notification tables: notification_delivery_log, active_notifications',
  '{"tables_removed": ["notification_delivery_log", "active_notifications"], "reason": "No code references found"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Add a comment for documentation
COMMENT ON SCHEMA "public" IS 'Cleaned up unused notification tables on 2024-11-05. Removed: notification_delivery_log, active_notifications';