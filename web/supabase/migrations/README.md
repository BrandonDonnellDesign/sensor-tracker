# Database Migrations

This directory contains all database migrations for the CGM Sensor Tracker application.

## Migration Order

Migrations should be applied in chronological order based on their timestamps:

### Core System (October 8, 2025)
1. `20251008000001_core_system.sql` - Core sensor tracking tables and functions
2. `20251008000002_user_features.sql` - User features and profiles
3. `20251008000003_admin_system.sql` - Admin functionality and permissions
4. `20251008000008_gamification_system_complete.sql` - **Complete gamification system**

## Gamification System

The complete gamification system is implemented in migration `20251008000008_gamification_system_complete.sql`.

### ✅ **Features Included:**
- **Achievement System** - 30+ achievements across 5 categories
- **Hidden Achievements** - Secret achievements with special tracking
- **Daily Activity Tracking** - Login streaks with milestone bonuses
- **Progress Calculation** - Smart progress bars for all achievement types
- **Sensor Tracking** - Automatic updates with database triggers
- **Milestone Bonuses** - Bonus points at 3, 7, 14, 30, 60, and 100-day streaks
- **Level System** - Exponential level progression
- **Achievement Notifications** - Real-time popup notifications

### 🚀 **Quick Setup:**
```sql
-- Award achievements to existing users
SELECT * FROM check_and_award_achievements('USER_ID_HERE');

-- View user stats
SELECT * FROM user_gamification_stats WHERE user_id = 'USER_ID_HERE';
```

## Development Workflow

1. **Create new migration**: Use timestamp format `YYYYMMDDHHMMSS_description.sql`
2. **Test locally**: Apply migration to local Supabase instance
3. **Document changes**: Update relevant README files
4. **Apply to production**: Use Supabase CLI or dashboard

## Troubleshooting

### Common Issues:
- **Function not found**: Ensure migrations are applied in correct order
- **Permission denied**: Check RLS policies and user roles
- **Column doesn't exist**: Verify schema migrations ran successfully

### 🎮 **Gamification Issues:**
- **No achievements awarded**: Run `SELECT * FROM check_and_award_achievements('USER_ID');`
- **Progress bars not showing**: Check achievement requirement_types match frontend
- **Sensor counts wrong**: Database triggers should auto-update counts
- **Streak not tracking**: Ensure login activity recording via auth provider
- **Hidden achievements not working**: Verify hidden achievement columns exist
- **Notifications not showing**: Check gamification provider integration