-- Clear all supplies inventory data
-- This will delete all entries but keep the table structure

DELETE FROM public.supply_usage_log;
DELETE FROM public.diabetes_supplies_inventory;

-- Reset any sequences if needed
-- (none needed for UUID primary keys)

COMMENT ON TABLE public.diabetes_supplies_inventory IS 'Inventory cleared and ready for fresh data';
