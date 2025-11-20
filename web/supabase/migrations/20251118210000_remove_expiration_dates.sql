-- Remove all expiration dates from supplies inventory
-- Expiration tracking is no longer used for supplies

UPDATE public.diabetes_supplies_inventory
SET expiration_date = NULL
WHERE expiration_date IS NOT NULL;

COMMENT ON COLUMN public.diabetes_supplies_inventory.expiration_date IS 'Deprecated - no longer used for tracking';
