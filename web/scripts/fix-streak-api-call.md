# Fix Streak API Call

To update your database and give you credit for all 75 days from October 14, 2025 to December 27, 2025, you can either:

## Option 1: Use the API Endpoint (Recommended)

Make a POST request to your deployed app:

```bash
curl -X POST https://your-app-domain.com/api/streak/fix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Or visit your app and click the "Fix Streak" button that should appear in the gamification widget.

## Option 2: Run SQL Script Directly

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-streak-database.sql`
4. Run the script

## Expected Results

After running either option, you should have:
- **Current streak**: 75 days
- **Activities**: Daily login entries from Oct 14, 2025 to Dec 27, 2025
- **Points**: Additional 375 points (75 days × 5 points per day)
- **Last activity date**: December 27, 2025

## Verification

You can verify the fix worked by checking:
1. The gamification widget shows 75-day streak
2. Your total points increased by 375
3. The streak status shows as "active" for today