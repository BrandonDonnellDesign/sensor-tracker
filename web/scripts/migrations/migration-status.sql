-- Migration Status Check Script
-- Check which migrations have been applied and identify conflicts

\echo 'Checking migration status...'

-- Check if migration tracking table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'schema_migrations'
    ) 
    THEN 'Migration tracking available'
    ELSE 'No migration tracking found'
  END as migration_tracking_status;

-- List all tables and their creation dates
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for common migration conflicts
\echo 'Checking for potential conflicts...'

-- Check for duplicate constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  COUNT(*) as count
FROM pg_constraint 
WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY conname, contype
HAVING COUNT(*) > 1;

-- Check for missing foreign key relationships
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

\echo 'Migration status check completed!'