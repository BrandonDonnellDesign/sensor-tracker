-- Consolidated and simplified trigger functions
-- Replaces duplicate trigger function definitions

-- Single updated_at trigger function for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public, pg_temp
SECURITY DEFINER;

-- Single new user handler function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public, pg_temp
SECURITY DEFINER;

-- Apply triggers to all tables that need updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_sensors_updated_at ON public.sensors;
DROP TRIGGER IF EXISTS update_photos_updated_at ON public.sensor_photos;
DROP TRIGGER IF EXISTS update_dexcom_tokens_updated_at ON public.dexcom_tokens;
DROP TRIGGER IF EXISTS update_dexcom_sync_settings_updated_at ON public.dexcom_sync_settings;

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at 
    BEFORE UPDATE ON public.sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensor_photos_updated_at 
    BEFORE UPDATE ON public.sensor_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();