# Security Configuration for Supabase

This document outlines the security improvements and configurations needed for the CGM Sensor Tracker.

## Database Function Security

The migration `20250105000001_fix_function_security.sql` fixes the following security issues:

### Fixed Functions
- `update_updated_at_column()` - Added `SET search_path = public, pg_temp`
- `handle_updated_at()` - Added `SET search_path = public, pg_temp`
- `handle_new_user()` - Added `SET search_path = public, pg_temp`
- `archive_expired_sensors()` - Added `SET search_path = public, pg_temp`
- `get_archival_stats()` - Added `SET search_path = public, pg_temp`
- `trigger_manual_archival()` - Added `SET search_path = public, pg_temp`
- `get_archival_schedule()` - Added `SET search_path = public, pg_temp`

### Security Improvements
- **Search Path Protection**: All functions now use a fixed search path to prevent SQL injection attacks
- **Function Isolation**: Functions can only access tables in the `public` schema and temporary tables
- **Security Definer**: Functions run with the privileges of the function owner, not the caller

## RLS Policy Performance Optimization

The migration `20250105000002_optimize_rls_policies.sql` optimizes RLS policies for better performance:

### Performance Improvements
- **Subquery Optimization**: Replaced `auth.uid()` with `(SELECT auth.uid())` to prevent per-row evaluation
- **Policy Consolidation**: Merged duplicate policies to reduce evaluation overhead
- **Index Optimization**: Added targeted indexes to support optimized policies

### Optimized Tables
- `sensors` - All CRUD policies optimized with subqueries
- `dexcom_tokens` - All CRUD policies optimized
- `dexcom_sync_settings` - All policies optimized
- `dexcom_sync_log` - Select policy optimized
- `profiles` - Consolidated and optimized policies
- `sensor_tags` - Consolidated policy with EXISTS subquery
- `archived_sensors` - Select policy optimized
- `sensor_photos` - All policies optimized
- `sensor_models` - Admin policies consolidated and optimized
- `notifications` - User policies optimized
- `tags` - Select policy optimized

### Performance Benefits
- **Reduced CPU Usage**: Auth functions evaluated once per query instead of per row
- **Better Query Plans**: PostgreSQL can optimize queries more effectively
- **Improved Scalability**: Performance remains consistent as data volume grows

## Auth Configuration

### Leaked Password Protection

To enable leaked password protection in Supabase:

1. **Via Supabase Dashboard:**
   - Go to Authentication > Settings
   - Scroll to "Password Protection"
   - Enable "Leaked Password Protection"
   - This will check passwords against the HaveIBeenPwned database

2. **Via Supabase CLI:**
   ```bash
   supabase secrets set --env-file .env.local
   # Add this to your project settings:
   # AUTH_SECURITY_LEAKED_PASSWORD_PROTECTION_ENABLED=true
   ```

3. **Environment Configuration:**
   Add to your Supabase project settings:
   ```
   AUTH_SECURITY_LEAKED_PASSWORD_PROTECTION_ENABLED=true
   ```

### Additional Security Recommendations

1. **Password Strength Requirements:**
   - Minimum 8 characters
   - Require uppercase, lowercase, numbers, and symbols
   - Can be configured in Auth settings

2. **Rate Limiting:**
   - Already enabled by default in Supabase
   - Protects against brute force attacks

3. **MFA (Multi-Factor Authentication):**
   - Consider enabling TOTP-based MFA for admin users
   - Available in Supabase Auth

4. **Session Management:**
   - Default JWT expiration is appropriate (1 hour)
   - Refresh tokens are handled securely

## Database Security

### Row Level Security (RLS)
- ✅ Already enabled on all user tables
- ✅ Users can only access their own data
- ✅ Admin functions properly secured

### Connection Security
- ✅ TLS encryption enabled
- ✅ Connection pooling configured
- ✅ Database credentials secured

## Deployment Checklist

Before deploying to production:

1. ✅ Run the security migration: `20250105000001_fix_function_security.sql`
2. ✅ Run the performance migration: `20250105000002_optimize_rls_policies.sql`
3. ⚠️ Enable leaked password protection in Supabase dashboard
4. ✅ Verify all RLS policies are working
5. ✅ Test function security with restricted users
6. ✅ Review and update any API keys/secrets
7. ✅ Test query performance with optimized RLS policies

## Testing Security

To verify the security fixes:

1. **Function Security Test:**
   ```sql
   -- This should work (uses public schema)
   SELECT get_archival_stats();
   
   -- This should be blocked (cannot access other schemas)
   -- Functions should not be able to access pg_catalog without explicit permission
   ```

2. **RLS Test:**
   ```sql
   -- Users should only see their own sensors
   SELECT * FROM sensors WHERE user_id != auth.uid(); -- Should return empty
   ```

3. **Authentication Test:**
   - Try registering with a known leaked password
   - Should be rejected if leaked password protection is enabled

## Monitoring

Monitor for security issues:
- Check Supabase logs for authentication failures
- Monitor function execution for errors
- Review RLS policy violations
- Track unusual database access patterns