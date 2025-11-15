-- Meal Templates System
-- Allows users to save frequently eaten meals for quick logging

-- Create meal_templates table
CREATE TABLE IF NOT EXISTS meal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  total_carbs NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_calories NUMERIC(10, 2),
  total_protein NUMERIC(10, 2),
  total_fat NUMERIC(10, 2),
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meal_template_items table (foods in the template)
CREATE TABLE IF NOT EXISTS meal_template_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_template_id UUID NOT NULL REFERENCES meal_templates(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  serving_size NUMERIC(10, 2),
  serving_unit TEXT,
  carbs_g NUMERIC(10, 2) NOT NULL,
  calories NUMERIC(10, 2),
  protein_g NUMERIC(10, 2),
  fat_g NUMERIC(10, 2),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id ON meal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_templates_meal_type ON meal_templates(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_templates_is_favorite ON meal_templates(is_favorite);
CREATE INDEX IF NOT EXISTS idx_meal_templates_use_count ON meal_templates(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_meal_template_items_template_id ON meal_template_items(meal_template_id);
CREATE INDEX IF NOT EXISTS idx_meal_template_items_sort_order ON meal_template_items(meal_template_id, sort_order);

-- Enable RLS
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_templates
CREATE POLICY "Users can view their own meal templates" ON meal_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal templates" ON meal_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal templates" ON meal_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal templates" ON meal_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for meal_template_items
CREATE POLICY "Users can view items in their meal templates" ON meal_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meal_templates 
      WHERE id = meal_template_items.meal_template_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items in their meal templates" ON meal_template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_templates 
      WHERE id = meal_template_items.meal_template_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their meal templates" ON meal_template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM meal_templates 
      WHERE id = meal_template_items.meal_template_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in their meal templates" ON meal_template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM meal_templates 
      WHERE id = meal_template_items.meal_template_id 
      AND user_id = auth.uid()
    )
  );

-- Function to update meal template totals
CREATE OR REPLACE FUNCTION update_meal_template_totals()
RETURNS TRIGGER AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Get the template_id from the affected row
  IF TG_OP = 'DELETE' THEN
    template_id := OLD.meal_template_id;
  ELSE
    template_id := NEW.meal_template_id;
  END IF;

  -- Recalculate totals for the template
  UPDATE meal_templates
  SET 
    total_carbs = COALESCE((
      SELECT SUM(carbs_g) 
      FROM meal_template_items 
      WHERE meal_template_id = template_id
    ), 0),
    total_calories = COALESCE((
      SELECT SUM(calories) 
      FROM meal_template_items 
      WHERE meal_template_id = template_id
    ), 0),
    total_protein = COALESCE((
      SELECT SUM(protein_g) 
      FROM meal_template_items 
      WHERE meal_template_id = template_id
    ), 0),
    total_fat = COALESCE((
      SELECT SUM(fat_g) 
      FROM meal_template_items 
      WHERE meal_template_id = template_id
    ), 0),
    updated_at = NOW()
  WHERE id = template_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update totals
CREATE TRIGGER trigger_update_template_totals_on_item_insert
  AFTER INSERT ON meal_template_items
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_template_totals();

CREATE TRIGGER trigger_update_template_totals_on_item_update
  AFTER UPDATE ON meal_template_items
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_template_totals();

CREATE TRIGGER trigger_update_template_totals_on_item_delete
  AFTER DELETE ON meal_template_items
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_template_totals();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meal_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_meal_templates_updated_at
  BEFORE UPDATE ON meal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_template_updated_at();

-- Function to increment use count when template is used
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE meal_templates
  SET 
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the migration
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'meals',
  'Meal templates system created',
  '{"tables": ["meal_templates", "meal_template_items"]}'::jsonb
)
ON CONFLICT DO NOTHING;
