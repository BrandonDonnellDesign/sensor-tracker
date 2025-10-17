-- Add preferred achievement tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN preferred_achievement_tracking VARCHAR(50) DEFAULT 'next_achievement';

-- Add comment to explain the field
COMMENT ON COLUMN profiles.preferred_achievement_tracking IS 'User preference for which achievement to track in gamification widget: next_achievement, current_streak, sensors_tracked, or level_progress';