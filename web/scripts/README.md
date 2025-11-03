# Scripts Directory

Essential utility scripts for the CGM Sensor Tracker application.

## 📁 Directory Structure

```
scripts/
├── database/           # Database management scripts
├── migrations/         # Migration helpers and fixes
├── testing/           # Test utilities and validation
├── maintenance/       # Cleanup and optimization
└── setup/            # Initial setup and configuration
```

## 🗄️ Database Scripts (`database/`)

- **`apply-all-migrations.sql`** - Apply all pending migrations in order (psql version)
- **`apply-all-migrations-sql.sql`** - Apply migrations (pure SQL version)
- **`vacuum-optimize.sql`** - PostgreSQL VACUUM and ANALYZE for optimization

## 🔄 Migration Scripts (`migrations/`)

- **`migration-status.sql`** - Check migration status and conflicts
- **`rollback-helpers.sql`** - Safe rollback utilities for emergency recovery

## 🧪 Testing Scripts (`testing/`)

- **`test-api-endpoints.js`** - API endpoint testing suite
- **`performance-test.js`** - Core Web Vitals testing utilities
- **`validate-migrations.js`** - Validate SQL migration syntax
- **`validate-setup.js`** - Validate complete application setup

## 🔧 Maintenance Scripts (`maintenance/`)

- **`cleanup-old-data.sql`** - Remove old/unused data
- **`monitor-auto-refresh.sql`** - Monitor Dexcom auto-refresh system
- **`performance-budget.js`** - Performance monitoring
- **`update-food-items.js`** - Food database updates (JS version)
- **`update-food-items.ts`** - Food database updates (TS version)

## ⚙️ Setup Scripts (`setup/`)

- **`initial-setup.sql`** - Complete database setup
- **`admin-setup.sql`** - Admin user configuration (consolidated)
- **`sample-data.sql`** - Sample data for development (consolidated)
- **`setup-dexcom-auto-refresh.sql`** - Configure pg_cron for auto-refresh
- **`apply-community-functions.sql`** - Apply community-specific functions
- **`apply-database-functions.sql`** - Apply core database functions
- **`fix-existing-community-setup.sql`** - Fix existing community installations

## 🚀 Quick Commands

### Database Setup
```bash
# Complete initial setup
psql -f scripts/setup/initial-setup.sql

# Apply all migrations
psql -f scripts/database/apply-all-migrations.sql

# Setup admin users
psql -f scripts/setup/admin-setup.sql
```

### Testing & Validation
```bash
# Validate migrations
node scripts/testing/validate-migrations.js

# Test API endpoints
node scripts/testing/test-api-endpoints.js

# Performance testing
node scripts/testing/performance-test.js
```

### Maintenance
```bash
# Update food database
node scripts/maintenance/update-food-items.js

# Database optimization
psql -f scripts/maintenance/vacuum-optimize.sql

# Cleanup old data
psql -f scripts/maintenance/cleanup-old-data.sql
```

## ⚠️ Important Notes

- **Always backup** your database before running scripts
- **Test in development** environment first
- **Check dependencies** - some scripts require environment variables
- Scripts are organized by function for easier maintenance