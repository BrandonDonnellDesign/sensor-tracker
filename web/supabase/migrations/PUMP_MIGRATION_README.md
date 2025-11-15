# Pump Data Migration Guide

This guide explains how to migrate pump-related data from the `insulin_logs` table into the new dedicated pump tables.

## Overview

The migration moves pump data from `insulin_logs` into three specialized tables:
- `pump_bolus_events` - Bolus deliveries (meal, correction)
- `pump_basal_events` - Basal rates and temp basals
- `pump_delivery_logs` - Unified log of all pump insulin delivery

## Migration Files

1. **20251115000001_migrate_pump_data.sql** - Main migration
2. **20251115000002_rollback_pump_migration.sql** - Rollback if needed
3. **20251115000003_verify_pump_migration.sql** - Verification tools

## What Gets Migrated

The migration identifies pump data using these criteria:
- `logged_via = 'pump_sync'`
- `injection_site = 'omnipod'`
- `injection_site` contains 'pump'

## Migration Process

### Step 1: Backup Your Data (Recommended)

```sql
-- Create a backup of insulin_logs
CREATE TABLE insulin_logs_backup AS SELECT * FROM insulin_logs;
```

### Step 2: Run the Migration

```bash
cd web
supabase db push
```

Or manually run the migration:

```sql
-- Run the migration file
\i supabase/migrations/20251115000001_migrate_pump_data.sql
```

### Step 3: Verify the Migration

```sql
-- Check migration statistics
SELECT * FROM pump_migration_stats;

-- Get detailed info for your user
SELECT * FROM get_user_pump_migration_info('your-user-id-here');

-- Compare IOB calculations
SELECT * FROM compare_iob_calculations('your-user-id-here');
```

### Step 4: Test Your Application

1. Check that pump data appears correctly in the UI
2. Verify IOB calculations are accurate
3. Test the unified `all_insulin_delivery` view
4. Ensure manual insulin logs still work

### Step 5: Clean Up (Optional)

After verifying everything works, you can optionally remove the migrated entries from `insulin_logs`:

```sql
-- ONLY RUN THIS AFTER THOROUGH VERIFICATION
DELETE FROM insulin_logs WHERE migrated_to_pump = TRUE;
```

## Rollback

If you encounter issues, you can rollback the migration:

```sql
-- Run the rollback migration
\i supabase/migrations/20251115000002_rollback_pump_migration.sql
```

This will:
- Remove all migrated data from pump tables
- Reset the `migrated_to_pump` flag
- Restore the original state

## Data Preservation

**Important:** The migration does NOT delete data from `insulin_logs`. It:
1. Copies pump data to the new tables
2. Adds a `migrated_to_pump` flag to mark migrated entries
3. Keeps the original data intact for safety

This allows you to:
- Verify the migration worked correctly
- Rollback if needed
- Manually delete old data later if desired

## Verification Queries

### Check migration counts

```sql
SELECT * FROM pump_migration_stats;
```

Expected output:
```
source_table         | migrated_count | remaining_count | total_count
---------------------|----------------|-----------------|------------
insulin_logs         | 150            | 300             | 450
pump_bolus_events    | 120            | 0               | 120
pump_basal_events    | 30             | 0               | 30
pump_delivery_logs   | 150            | 0               | 150
```

### Check your user's data

```sql
SELECT * FROM get_user_pump_migration_info(auth.uid());
```

### Verify IOB calculations match

```sql
SELECT * FROM compare_iob_calculations(auth.uid());
```

The IOB values should be very close (within rounding differences).

## Unified View

After migration, use the `all_insulin_delivery` view to query all insulin data:

```sql
-- Get all insulin delivery (manual + pump) for the last 24 hours
SELECT * FROM all_insulin_delivery
WHERE user_id = auth.uid()
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

## IOB Calculation

The new `calculate_total_iob()` function automatically includes both manual and pump data:

```sql
-- Get current IOB from all sources
SELECT calculate_total_iob(auth.uid());

-- Get IOB at a specific time
SELECT calculate_total_iob(auth.uid(), '2024-11-15 14:30:00+00');
```

## Troubleshooting

### No data was migrated

Check if you have pump data:

```sql
SELECT COUNT(*) FROM insulin_logs
WHERE logged_via = 'pump_sync' 
   OR injection_site = 'omnipod'
   OR injection_site ILIKE '%pump%';
```

If this returns 0, you don't have any pump data to migrate.

### IOB calculations don't match

This could be due to:
1. Rounding differences (expected, should be < 0.1 units)
2. Different insulin types (pump tables use exponential decay)
3. Data integrity issues

Run the comparison query to investigate:

```sql
SELECT * FROM compare_iob_calculations(auth.uid());
```

### Migration failed partway through

The migration uses `ON CONFLICT DO NOTHING`, so it's safe to re-run. If you need to start fresh:

1. Run the rollback migration
2. Fix any issues
3. Re-run the main migration

## Support

If you encounter issues:
1. Check the `system_logs` table for migration logs
2. Verify your data with the verification queries
3. Use the rollback migration if needed
4. Keep the backup until you're confident everything works

## Next Steps

After successful migration:
1. Update your application code to use the new pump tables
2. Modify the Glooko import to write directly to pump tables
3. Keep the unified view for backward compatibility
4. Consider archiving old migrated data after 30 days
