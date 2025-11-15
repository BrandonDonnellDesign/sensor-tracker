# Pump Data Migration

## Overview

This migration separates pump data from manual insulin entries into dedicated tables for better organization and performance.

## What Was Done

### 1. Database Structure
- **pump_bolus_events** - Detailed bolus data (meal, correction)
- **pump_basal_events** - Detailed basal data (scheduled, temp)
- **pump_delivery_logs** - Unified log of all pump insulin delivery
- **all_insulin_delivery** - View combining manual + pump data

### 2. Code Updates
- 22 files updated to read from `all_insulin_delivery` view
- 5 files correctly use `insulin_logs` for manual entries
- Glooko import writes directly to pump tables

### 3. Data Flow

```
Manual Entry → insulin_logs
Pump Import → pump tables (directly)
All Queries → all_insulin_delivery view
```

## Deployment

### Step 1: Apply Migrations
```bash
cd web
supabase db push
```

### Step 2: Test
- Import a Glooko file
- Verify data appears in pump tables
- Check IOB calculations
- Test manual entry forms

### Step 3: Monitor
- Watch for errors
- Verify no duplicates
- Check data accuracy

## Migration Details

### What Gets Migrated (One-Time)
The migration script moves existing pump data from `insulin_logs` to pump tables:
- `logged_via = 'csv_import'` (Glooko imports)
- `logged_via = 'quick_bolus'` (Quick bolus entries)
- `injection_site = 'omnipod'` (Omnipod deliveries)
- `logged_via = 'pump_sync'` (Future pump sync)

### What Stays in insulin_logs
- Manual pen/syringe injections (`logged_via = 'manual'`)

### New Imports (After Deployment)
- Glooko imports write directly to pump tables
- No migration needed for new data
- Clean separation maintained

## Verification

```sql
-- Check migration status
SELECT * FROM pump_migration_stats;

-- Check your data
SELECT * FROM get_user_pump_migration_info(auth.uid());

-- Verify IOB calculations
SELECT * FROM compare_iob_calculations(auth.uid());
```

## Rollback

If issues occur:
```bash
cd web
psql $DATABASE_URL -f supabase/migrations/20251115000002_rollback_pump_migration.sql
```

## Files

### Migrations
- `20251115000001_migrate_pump_data.sql` - Main migration
- `20251115000002_rollback_pump_migration.sql` - Rollback script
- `20251115000003_verify_pump_migration.sql` - Verification tools
- `20251115000004_enhance_all_insulin_delivery_view.sql` - Unified view

### Services
- `lib/services/pump-data-writer.ts` - Service for writing pump data

### Key Files Updated
- `app/api/insulin/import/glooko/route.ts` - Writes to pump tables
- All IOB calculation components
- All analytics/statistics components
- All export functionality

## Benefits

- ✅ Clean separation of pump vs manual data
- ✅ Better performance with optimized indexes
- ✅ No duplicate data
- ✅ Easier to maintain
- ✅ Ready for future pump integrations
- ✅ Accurate IOB calculations from all sources

## Support

Check `system_logs` table for migration logs:
```sql
SELECT * FROM system_logs 
WHERE category = 'pump' 
ORDER BY created_at DESC;
```
