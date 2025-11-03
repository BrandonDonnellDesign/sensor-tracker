-- Master Setup Script
-- Orchestrates complete application setup in correct order

\echo '🚀 Starting complete CGM Companion App setup...'
\echo ''

-- Step 1: Initial database setup
\echo '📊 Step 1: Initial Database Setup'
\i setup/initial-setup.sql
\echo ''

-- Step 2: Apply all migrations
\echo '🔄 Step 2: Applying All Migrations'
\i database/apply-all-migrations.sql
\echo ''

-- Step 3: Setup admin users
\echo '👤 Step 3: Admin User Setup'
\i setup/admin-setup.sql
\echo ''

-- Step 4: Add sample data (optional for development)
\echo '📝 Step 4: Sample Data (Development)'
\echo 'Uncomment the next line to add sample data:'
-- \i setup/sample-data.sql
\echo ''

-- Step 5: Optimize database
\echo '⚡ Step 5: Database Optimization'
\i database/vacuum-optimize.sql
\echo ''

\echo '🎉 Complete setup finished!'
\echo ''
\echo '📋 Next Steps:'
\echo '1. Run: node scripts/testing/validate-setup.js'
\echo '2. Start your application server'
\echo '3. Visit /dashboard/settings to test Dexcom auto-refresh'
\echo '4. Check /community for community features'
\echo ''
\echo '🔧 Maintenance Commands:'
\echo '- Database cleanup: psql -f scripts/maintenance/cleanup-old-data.sql'
\echo '- Performance monitoring: node scripts/maintenance/performance-budget.js'
\echo '- Food database update: node scripts/maintenance/update-food-items.js'