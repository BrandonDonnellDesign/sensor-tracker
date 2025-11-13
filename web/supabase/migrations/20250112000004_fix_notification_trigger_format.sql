-- Fix the notification trigger to use CONCAT instead of format() to avoid period issues

CREATE OR REPLACE FUNCTION notify_insulin_logged()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications for non-import entries
  IF NEW.logged_via != 'csv_import' THEN
    IF NEW.delivery_type = 'basal' OR NEW.insulin_type = 'long' THEN
      -- Create notification for basal insulin
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES (
        NEW.user_id,
        'insulin_logged',
        'Basal Insulin Logged',
        CONCAT('Logged ', NEW.units::text, ' units of basal insulin at ', NEW.taken_at::text),
        jsonb_build_object(
          'insulin_id', NEW.id,
          'units', NEW.units,
          'insulin_type', NEW.insulin_type,
          'taken_at', NEW.taken_at
        ),
        NOW()
      );
    ELSE
      -- Create notification for bolus insulin
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES (
        NEW.user_id,
        'insulin_logged',
        'Bolus Insulin Logged',
        CONCAT('Logged ', NEW.units::text, ' units of ', NEW.insulin_type, ' insulin at ', NEW.taken_at::text),
        jsonb_build_object(
          'insulin_id', NEW.id,
          'units', NEW.units,
          'insulin_type', NEW.insulin_type,
          'taken_at', NEW.taken_at
        ),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
