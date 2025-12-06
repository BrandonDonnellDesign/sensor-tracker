-- Fix remaining functions with mutable search_path
-- Use ALTER FUNCTION to set search_path without changing function signatures

-- Fix check_glucose_notifications
ALTER FUNCTION check_glucose_notifications() SET search_path = public;

-- Fix cleanup_expired_notifications  
ALTER FUNCTION cleanup_expired_notifications() SET search_path = public;

-- Fix detect_glucose_patterns
ALTER FUNCTION detect_glucose_patterns(UUID) SET search_path = public;

-- Fix check_iob_safety_notifications
ALTER FUNCTION check_iob_safety_notifications() SET search_path = public;

-- Fix update_prediction_accuracy
ALTER FUNCTION update_prediction_accuracy() SET search_path = public;
