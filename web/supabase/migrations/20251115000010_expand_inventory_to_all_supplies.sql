-- Expand inventory system to track all diabetes supplies

-- Create supply categories enum
CREATE TYPE supply_category AS ENUM (
    'sensors',
    'insulin',
    'test_strips',
    'lancets',
    'pump_supplies',
    'pen_needles',
    'syringes',
    'batteries',
    'adhesive',
    'other'
);

-- Create diabetes supplies inventory table
CREATE TABLE IF NOT EXISTS public.diabetes_supplies_inventory (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category supply_category NOT NULL,
    item_name text NOT NULL,
    brand text,
    quantity integer NOT NULL DEFAULT 0,
    unit text NOT NULL DEFAULT 'units', -- units, boxes, vials, pens, etc.
    expiration_date date,
    lot_number text,
    location text, -- where stored: fridge, cabinet, travel bag, etc.
    notes text,
    reorder_threshold integer, -- alert when quantity drops below this
    cost_per_unit numeric(10,2), -- optional cost tracking
    last_updated timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create supply usage log table
CREATE TABLE IF NOT EXISTS public.supply_usage_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    supply_id uuid NOT NULL REFERENCES public.diabetes_supplies_inventory(id) ON DELETE CASCADE,
    quantity_used integer NOT NULL,
    used_at timestamptz DEFAULT now() NOT NULL,
    notes text
);

-- Add indexes
CREATE INDEX IF NOT EXISTS diabetes_supplies_inventory_user_id_idx ON public.diabetes_supplies_inventory(user_id);
CREATE INDEX IF NOT EXISTS diabetes_supplies_inventory_category_idx ON public.diabetes_supplies_inventory(category);
CREATE INDEX IF NOT EXISTS diabetes_supplies_inventory_expiration_idx ON public.diabetes_supplies_inventory(expiration_date);
CREATE INDEX IF NOT EXISTS supply_usage_log_user_id_idx ON public.supply_usage_log(user_id);
CREATE INDEX IF NOT EXISTS supply_usage_log_supply_id_idx ON public.supply_usage_log(supply_id);
CREATE INDEX IF NOT EXISTS supply_usage_log_used_at_idx ON public.supply_usage_log(used_at);

-- Enable RLS
ALTER TABLE public.diabetes_supplies_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_usage_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory
CREATE POLICY "Users can view their own supplies"
    ON public.diabetes_supplies_inventory
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own supplies"
    ON public.diabetes_supplies_inventory
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplies"
    ON public.diabetes_supplies_inventory
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplies"
    ON public.diabetes_supplies_inventory
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create RLS policies for usage log
CREATE POLICY "Users can view their own usage log"
    ON public.supply_usage_log
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage log"
    ON public.supply_usage_log
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own usage log"
    ON public.supply_usage_log
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create view for supplies with usage statistics
CREATE OR REPLACE VIEW public.supplies_with_stats AS
SELECT 
    s.*,
    COALESCE(SUM(u.quantity_used), 0) as total_used,
    COUNT(u.id) as usage_count,
    MAX(u.used_at) as last_used_at,
    CASE 
        WHEN s.reorder_threshold IS NOT NULL AND s.quantity <= s.reorder_threshold THEN true
        ELSE false
    END as needs_reorder,
    CASE 
        WHEN s.expiration_date IS NOT NULL AND s.expiration_date <= CURRENT_DATE THEN 'expired'
        WHEN s.expiration_date IS NOT NULL AND s.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'good'
    END as expiration_status
FROM public.diabetes_supplies_inventory s
LEFT JOIN public.supply_usage_log u ON s.id = u.supply_id
GROUP BY s.id;

-- Grant access to view
GRANT SELECT ON public.supplies_with_stats TO authenticated;

-- Function to automatically log usage when quantity decreases
CREATE OR REPLACE FUNCTION log_supply_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- If quantity decreased, log the usage
    IF NEW.quantity < OLD.quantity THEN
        INSERT INTO public.supply_usage_log (
            user_id,
            supply_id,
            quantity_used,
            used_at
        ) VALUES (
            NEW.user_id,
            NEW.id,
            OLD.quantity - NEW.quantity,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic usage logging
CREATE TRIGGER log_supply_usage_trigger
    AFTER UPDATE ON public.diabetes_supplies_inventory
    FOR EACH ROW
    WHEN (NEW.quantity < OLD.quantity)
    EXECUTE FUNCTION log_supply_usage();

-- Migrate existing sensor inventory to new system
INSERT INTO public.diabetes_supplies_inventory (
    user_id,
    category,
    item_name,
    brand,
    quantity,
    unit,
    location,
    notes,
    last_updated,
    created_at
)
SELECT 
    si.user_id,
    'sensors'::supply_category,
    COALESCE(sm.model_name, 'CGM Sensor'),
    sm.manufacturer,
    si.quantity,
    'sensors',
    si.location,
    si.notes,
    si.last_updated,
    NOW()
FROM public.sensor_inventory si
LEFT JOIN public.sensor_models sm ON si.sensor_model_id = sm.id
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.diabetes_supplies_inventory IS 'Comprehensive inventory tracking for all diabetes supplies';
COMMENT ON TABLE public.supply_usage_log IS 'Log of supply usage over time for analytics';
COMMENT ON VIEW public.supplies_with_stats IS 'Supplies with usage statistics and alerts';
