-- Add sensor tags system for categorizing issues and patterns
-- This allows users to tag sensors with predefined categories for better tracking

-- Create tags lookup table with predefined categories
CREATE TABLE public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280', -- Default gray color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create sensor_tags junction table for many-to-many relationship
CREATE TABLE public.sensor_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(sensor_id, tag_id) -- Prevent duplicate tags on same sensor
);

-- Create indexes for performance
CREATE INDEX idx_sensor_tags_sensor_id ON public.sensor_tags(sensor_id);
CREATE INDEX idx_sensor_tags_tag_id ON public.sensor_tags(tag_id);
CREATE INDEX idx_tags_category ON public.tags(category);

-- Insert predefined tags
INSERT INTO public.tags (name, category, description, color) VALUES
  -- Adhesive Issues
  ('Adhesive Failed', 'adhesive', 'Sensor came off due to adhesive failure', '#ef4444'),
  ('Poor Adhesion', 'adhesive', 'Sensor had weak adhesive from start', '#f97316'),
  ('Skin Reaction', 'adhesive', 'Allergic reaction or skin irritation from adhesive', '#eab308'),
  ('Fell Off Swimming', 'adhesive', 'Sensor came off while swimming or in water', '#3b82f6'),
  ('Fell Off Exercise', 'adhesive', 'Sensor came off during physical activity', '#8b5cf6'),
  
  -- Device Errors
  ('Signal Lost', 'device_error', 'Sensor stopped transmitting data', '#dc2626'),
  ('Inaccurate Readings', 'device_error', 'Sensor providing incorrect glucose values', '#ea580c'),
  ('Sensor Error', 'device_error', 'General sensor malfunction or error message', '#d97706'),
  ('Bluetooth Issues', 'device_error', 'Connection problems with phone/receiver', '#2563eb'),
  ('Calibration Problems', 'device_error', 'Sensor requiring excessive calibration', '#7c3aed'),
  
  -- Replacement Requests
  ('Defective Unit', 'replacement', 'Sensor was defective from manufacturer', '#991b1b'),
  ('Early Failure', 'replacement', 'Sensor failed before expected lifespan', '#c2410c'),
  ('Warranty Claim', 'replacement', 'Submitted warranty claim for replacement', '#a16207'),
  
  -- Physical Issues
  ('Damaged Packaging', 'physical', 'Sensor packaging was damaged upon receipt', '#b45309'),
  ('Insertion Problems', 'physical', 'Difficulty inserting sensor or applicator issues', '#9333ea'),
  ('Painful Insertion', 'physical', 'Sensor insertion was more painful than usual', '#c026d3'),
  
  -- Usage Issues
  ('User Error', 'usage', 'Removed accidentally or due to user mistake', '#059669'),
  ('Lifestyle Conflict', 'usage', 'Sensor interfered with daily activities', '#0d9488'),
  ('Comfort Issues', 'usage', 'Sensor was uncomfortable or irritating', '#0891b2'),
  
  -- Other
  ('Good Performance', 'positive', 'Sensor worked well throughout its lifespan', '#16a34a'),
  ('Expired', 'lifecycle', 'Sensor reached end of normal lifespan', '#6b7280'),
  ('Other', 'general', 'Other issue not covered by standard categories', '#4b5563');

-- Add RLS policies for tags (read-only for users)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags are viewable by all authenticated users" ON public.tags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add RLS policies for sensor_tags
ALTER TABLE public.sensor_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sensor tags" ON public.sensor_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sensors 
      WHERE sensors.id = sensor_tags.sensor_id 
      AND sensors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags for their own sensors" ON public.sensor_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sensors 
      WHERE sensors.id = sensor_tags.sensor_id 
      AND sensors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags from their own sensors" ON public.sensor_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sensors 
      WHERE sensors.id = sensor_tags.sensor_id 
      AND sensors.user_id = auth.uid()
    )
  );