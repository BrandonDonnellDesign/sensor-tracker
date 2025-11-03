# Database Migrations

This directory contains Supabase database migrations for the CGM Sensor Tracker application.

## Migration Files

### 20251030000001_create_system_logs_table.sql
- **Purpose**: Creates the `system_logs` table for security and system event logging
- **Features**:
  - Structured logging with levels (info, warn, error)
  - Category-based organization (security, system, admin)
  - JSON metadata support for flexible data storage
  - Row Level Security (RLS) policies
  - Optimized indexes for performance

### 20251030000002_add_security_functions.sql
- **Purpose**: Adds security logging functions and automatic triggers
- **Features**:
  - `log_security_event()` function for consistent logging
  - Automatic profile change logging
  - Bulk operation detection and logging
  - Trigger-based security monitoring

## Running Migrations

### Using Supabase CLI
```bash
# Apply all pending migrations
supabase db push

# Reset database and apply all migrations
supabase db reset
```

### Manual Application
If you prefer to run migrations manually in the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration content
4. Execute the SQL

## Migration Order

Migrations must be applied in order:
1. `20251030000001_create_system_logs_table.sql` - Creates the base table
2. `20251030000002_add_security_functions.sql` - Adds functions and triggers

## Security Features

The migrations enable:
- **Audit Trail**: All security events are logged with timestamps
- **User Privacy**: User IDs are hashed for privacy protection
- **Automatic Detection**: Triggers detect suspicious patterns
- **Access Control**: RLS policies ensure proper data access

## Testing Migrations

After applying migrations, verify they work correctly:

```sql
-- Test the logging function
SELECT log_security_event('info', 'test', 'Migration test', 'test_user', '{"test": true}');

-- Check the logs
SELECT * FROM system_logs WHERE category = 'test' ORDER BY created_at DESC LIMIT 5;

-- Clean up test data
DELETE FROM system_logs WHERE category = 'test';
```

## Rollback

If you need to rollback these migrations:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_log_profile_changes ON profiles;
DROP TRIGGER IF EXISTS trigger_log_bulk_sensors ON sensors;

-- Remove functions
DROP FUNCTION IF EXISTS log_security_event;
DROP FUNCTION IF EXISTS log_profile_changes;
DROP FUNCTION IF EXISTS log_bulk_sensor_operations;

-- Remove table
DROP TABLE IF EXISTS system_logs;
```

## Notes

- The `system_logs` table uses UUID primary keys for better performance
- Indexes are optimized for common query patterns (time-based, category-based)
- RLS policies ensure users can only see their own logs
- The service role has full access for admin operations