-- Initial Database Setup Script
-- Consolidates all setup scripts for fresh installation

\echo 'Starting initial database setup...'

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Apply all core functions and setup
\i setup-dexcom-auto-refresh.sql

-- Apply community setup
\i fix-existing-community-setup.sql

-- Apply database functions
\i apply-database-functions.sql

-- Apply community functions
\i apply-community-functions.sql

\echo 'Initial setup completed!'
\echo 'Database is ready for migration application.'