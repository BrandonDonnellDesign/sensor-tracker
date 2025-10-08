# Gamification System

Complete gamification system for the CGM Sensor Tracker application.

## Overview

The gamification system is fully implemented in migration `20251008000008_gamification_system_complete.sql` and includes:

- ✅ **Achievement System** - Sensor tracking, streaks, success rates, and hidden achievements
- ✅ **Daily Activity Tracking** - Login streaks with milestone bonuses  
- ✅ **Progress Calculation** - Smart progress bars for all achievement types
- ✅ **Sensor Tracking** - Automatic updates with database triggers
- ✅ **Hidden Achievements** - Secret achievements with special tracking columns
- ✅ **Milestone Bonuses** - Bonus points at 3, 7, 14, 30, 60, and 100-day streaks

## Quick Start

```sql
-- Award achievements to a specific user
SELECT * FROM check_and_award_achievements('USER_ID_HERE');

-- Check user's current stats
SELECT * FROM user_gamification_stats WHERE user_id = 'USER_ID_HERE';

-- View all available achievements
SELECT name, description, points, category FROM achievements WHERE is_active = true;
```

## Achievement Categories

### 🎯 **Tracking Achievements** (`sensor_count`)
- First Steps (1 sensor) - 50 points
- Getting Started (5 sensors) - 100 points  
- Sensor Veteran (25 sensors) - 250 points
- Tracking Master (50 sensors) - 500 points
- Sensor Legend (100 sensors) - 1000 points

### 🔥 **Streak Achievements** (`streak_days`)
- First Streak (3 days) - 75 points + 25 bonus
- Weekly Champion (7 days) - 150 points + 50 bonus
- Streak Master (14 days) - 300 points + 100 bonus
- Consistency Legend (30 days) - 600 points + 200 bonus
- Streak Veteran (60 days) - 1000 points + 400 bonus
- Streak Legend (100 days) - 2000 points + 1000 bonus

### 📊 **Success Rate Achievements** (`success_rate`)
- Good Performance (80%+) - 200 points
- Excellent Performance (90%+) - 400 points  
- Perfect Performance (95%+) - 800 points

### 🔮 **Hidden Achievements** (`hidden_trigger`)
- Hidden Gem (1+ sensors) - 200 points
- The Scientist (10+ analytics views) - 150 points
- Smooth Operator (10+ stable sensors) - 200 points
- The Archivist (50+ archived sensors) - 250 points
- Early Adopter (≤30 days old account) - 300 points
- Perfectionist (5+ sensor edits) - 150 points
- Tag Wizard (8+ different tags) - 200 points
- Data Hoarder (200+ total sensors) - 400 points
- The Curator (20+ photos added) - 250 points
- Meta Explorer (visited special pages) - 100 points
- Completionist (100% achievement completion) - 500 points

### ⚡ **Special Achievements** (`special_action`)
- Future features for integrations, detailed notes, archiving, etc.

## Level Calculation

Exponential growth formula: `Level = floor(log2(points/100)) + 2`

**Examples:**
- 0-99 points: Level 1
- 100-199 points: Level 2
- 200-399 points: Level 3
- 400-799 points: Level 4
- 800-1599 points: Level 5

## Frontend Integration

- **GamificationProvider** - React context for state management
- **GamificationWidget** - Dashboard progress display
- **AchievementNotification** - Popup notifications for new achievements
- **StreakIndicator** - Visual streak counter
- **LevelBadge** - User level display