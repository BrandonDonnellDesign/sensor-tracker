-- Add preferred achievement ID to profiles table for specific achievement tracking
ALTER TABLE profiles 
ADD COLUMN preferred_achievement_id VARCHAR(50) DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN profiles.preferred_achievement_id IS 'Specific achievement ID when preferred_achievement_tracking is set to specific_achievement';

-- Update the existing comment to include the new option
COMMENT ON COLUMN profiles.preferred_achievement_tracking IS 'User preference for which achievement to track in gamification widget: next_achievement, current_streak, sensors_tracked, level_progress, or specific_achievement';