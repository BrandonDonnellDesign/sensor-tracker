# Streak Adjuster - Admin Tool

## Overview
The Streak Adjuster is an admin tool that allows you to manually adjust a user's streak days and automatically recalculate their points, level, and achievements.

## Location
Navigate to: **Admin Panel → Gamification → Streak Adjuster Tab**

URL: `/admin/gamification` (then click the "Streak Adjuster" tab)

## Features

### 1. Manual Streak Adjustment
- Set any user's streak to a specific number of days
- Supports both increasing and decreasing streaks
- Minimum value: 0 days

### 2. Automatic Recalculation
When you adjust a streak, the system automatically:
- **Recalculates Points**: 10 points per streak day
  - Increasing streak: Adds points
  - Decreasing streak: Removes points (minimum 0)
- **Updates Level**: Recalculates based on new total points
- **Updates Longest Streak**: If new streak exceeds previous record
- **Checks Achievements**: Awards any newly unlocked achievements

### 3. Achievement Detection
The system checks for achievements related to:
- Streak milestones (3, 7, 14, 30+ days)
- Point thresholds
- Level achievements
- Any other achievement criteria that may now be met

## How to Use

### Step 1: Get User ID
1. Find the user's UUID from:
   - Admin Users page
   - Database query
   - User profile URL

### Step 2: Adjust Streak
1. Go to Admin Panel → Gamification → Streak Adjuster
2. Enter the **User ID** (UUID)
3. Enter the **New Streak** value (number of days)
4. Click **"Adjust Streak & Recalculate"**

### Step 3: Review Changes
The system will display:
- **Streak Changes**: Old → New streak with difference
- **Points Changes**: Old → New points with adjustment amount
- **Level Changes**: Old → New level (if changed)
- **Longest Streak**: Updated if new streak is higher
- **New Achievements**: Any achievements unlocked by the adjustment
- **All Achievements**: Complete list of user's achievements

## Example Scenarios

### Scenario 1: Correcting a Missed Day
**Situation**: User logged activity but streak didn't update
- Current Streak: 5 days
- Should Be: 6 days
- **Action**: Set new streak to 6
- **Result**: +10 points, streak updated to 6

### Scenario 2: Rewarding Consistent User
**Situation**: Want to reward a loyal user
- Current Streak: 10 days
- Reward: 20 days
- **Action**: Set new streak to 20
- **Result**: +100 points, possible level up, may unlock "2 Week Streak" achievement

### Scenario 3: Fixing Data Error
**Situation**: User's streak was incorrectly inflated
- Current Streak: 50 days (incorrect)
- Actual: 15 days
- **Action**: Set new streak to 15
- **Result**: -350 points, possible level down, longest streak remains 50

## Points Calculation

### Formula
```
Points Adjustment = (New Streak - Old Streak) × 10
New Total Points = Max(0, Old Total Points + Points Adjustment)
```

### Examples
- 5 → 10 days: +50 points
- 20 → 25 days: +50 points
- 30 → 20 days: -100 points
- 5 → 0 days: -50 points

## Level Calculation

Levels are calculated exponentially based on total points:
```
Level 1: 0-99 points
Level 2: 100-199 points
Level 3: 200-399 points
Level 4: 400-799 points
Level 5: 800-1599 points
...
```

Formula: `Level = floor(log2(points / 100)) + 2` (for points ≥ 100)

## Achievement System

### Automatic Detection
After adjusting the streak, the system runs `check_and_award_achievements()` which:
1. Checks all active achievements
2. Evaluates if user now meets criteria
3. Awards any newly unlocked achievements
4. Updates user's achievement count
5. Adds achievement points to total

### Common Streak Achievements
- **First Steps**: 3-day streak
- **Week Warrior**: 7-day streak
- **Fortnight Fighter**: 14-day streak
- **Monthly Master**: 30-day streak
- **Legendary Streak**: 100-day streak

## API Endpoint

### POST `/api/admin/gamification/adjust-streak`

**Request Body:**
```json
{
  "userId": "uuid-string",
  "newStreak": 15
}
```

**Response:**
```json
{
  "success": true,
  "changes": {
    "oldStreak": 10,
    "newStreak": 15,
    "streakDifference": 5,
    "oldPoints": 500,
    "newPoints": 550,
    "pointsAdjustment": 50,
    "oldLevel": 3,
    "newLevel": 3,
    "oldLongestStreak": 12,
    "newLongestStreak": 15
  },
  "updatedStats": { ... },
  "newAchievements": [ ... ],
  "totalAchievements": 8,
  "achievements": [ ... ]
}
```

## Security

### Admin Only
- Requires authenticated admin user
- Checks `profiles.is_admin = true`
- Returns 401 if not authenticated
- Returns 403 if not admin

### Validation
- User ID must be valid UUID
- New streak must be non-negative number
- User must have gamification stats record

## Best Practices

1. **Verify User ID**: Double-check the UUID before adjusting
2. **Document Reason**: Keep a log of why adjustments were made
3. **Communicate**: Inform users of manual adjustments when appropriate
4. **Review Impact**: Check the changes summary before confirming
5. **Monitor Achievements**: Ensure newly awarded achievements are appropriate

## Troubleshooting

### Error: "User gamification stats not found"
- User hasn't logged in since gamification was enabled
- Solution: User needs to log in once to create stats record

### Error: "Unauthorized"
- Not logged in as admin
- Solution: Log in with admin account

### Error: "Invalid parameters"
- Missing userId or newStreak
- newStreak is negative
- Solution: Provide valid parameters

## Database Tables Affected

- `user_gamification_stats`: Updated with new streak, points, level
- `user_achievements`: New achievements added if criteria met
- `daily_activities`: Last activity date updated

## Notes

- Longest streak is never decreased (only increased if new streak is higher)
- Points cannot go below 0
- Level is recalculated based on total points
- Achievement check runs automatically after adjustment
- Changes are immediate and permanent
