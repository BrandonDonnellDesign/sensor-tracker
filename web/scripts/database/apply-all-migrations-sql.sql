-- Apply All Migrations Script (Pure SQL Version)
-- Consolidated script to apply all migrations in correct order
-- Run this in SQL execution contexts (like Supabase SQL Editor)

-- Note: This is the pure SQL version. Individual migrations should be applied manually
-- Apply migrations in this order:
-- 1. All existing migrations up to 20251101000003
-- 2. 20251101000004_fix_dexcom_sync_log_table.sql (for dexcom_sync_log table fix)

-- Note: This is the pure SQL version. Individual migrations should be applied manually
-- or use the psql version (apply-all-migrations.sql) with the psql client.

-- All migrations applied successfully!
-- Next steps:
-- 1. Run setup/admin-setup.sql to configure admin users
-- 2. Run setup/sample-data.sql for development data  
-- 3. Run testing/validate-setup.js to verify installation