-- Auto-create profiles when users sign up
-- This migration creates a trigger to automatically create a profile when a user registers

-- Function to create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    timezone,
    date_format,
    time_format,
    notifications_enabled,
    dark_mode_enabled,
    glucose_unit,
    push_notifications_enabled,
    in_app_notifications_enabled,
    warning_days_before,
    critical_days_before
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'UTC',
    'MM/dd/yyyy',
    '12h',
    true,
    false,
    'mg/dL',
    true,
    true,
    7,
    3
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create initial gamification stats for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial gamification stats
  INSERT INTO public.user_gamification_stats (
    user_id,
    total_points,
    current_streak,
    longest_streak,
    level,
    sensors_added,
    photos_uploaded,
    days_active,
    achievements_unlocked
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for gamification stats
DROP TRIGGER IF EXISTS on_auth_user_created_gamification ON auth.users;
CREATE TRIGGER on_auth_user_created_gamification
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_gamification();