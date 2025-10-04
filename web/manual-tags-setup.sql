-- Run this SQL script in your Supabase SQL Editor to enable tags functionality

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create sensor_tags junction table
CREATE TABLE IF NOT EXISTS public.sensor_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(sensor_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sensor_tags_sensor_id ON public.sensor_tags(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_tags_tag_id ON public.sensor_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON public.tags(category);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Tags are viewable by all authenticated users" ON public.tags;
CREATE POLICY "Tags are viewable by all authenticated users" ON public.tags
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their own sensor tags" ON public.sensor_tags;
CREATE POLICY "Users can view their own sensor tags" ON public.sensor_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sensors 
      WHERE sensors.id = sensor_tags.sensor_id 
      AND sensors.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert tags for their own sensors" ON public.sensor_tags;
CREATE POLICY "Users can insert tags for their own sensors" ON public.sensor_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sensors 
      WHERE sensors.id = sensor_tags.sensor_id 
      AND sensors.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete tags from their own sensors" ON public.sensor_tags;
CREATE POLICY "Users can delete tags from their own sensors" ON public.sensor_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sensors 
      WHERE sensors.id = sensor_tags.sensor_id 
      AND sensors.user_id = auth.uid()
    )
  );

-- Insert predefined tags (only if they don't exist)
INSERT INTO public.tags (name, category, description, color) VALUES
  ('Adhesive Failed', 'adhesive', 'Sensor came off due to adhesive failure', '#ef4444'),
  ('Poor Adhesion', 'adhesive', 'Sensor had weak adhesive from start', '#f97316'),
  ('Skin Reaction', 'adhesive', 'Allergic reaction or skin irritation from adhesive', '#eab308'),
  ('Fell Off Swimming', 'adhesive', 'Sensor came off while swimming or in water', '#3b82f6'),
  ('Fell Off Exercise', 'adhesive', 'Sensor came off during physical activity', '#8b5cf6'),
  ('Signal Lost', 'device_error', 'Sensor stopped transmitting data', '#dc2626'),
  ('Inaccurate Readings', 'device_error', 'Sensor providing incorrect glucose values', '#ea580c'),
  ('Sensor Error', 'device_error', 'General sensor malfunction or error message', '#d97706'),
  ('Bluetooth Issues', 'device_error', 'Connection problems with phone/receiver', '#2563eb'),
  ('Calibration Problems', 'device_error', 'Sensor requiring excessive calibration', '#7c3aed'),
  ('Defective Unit', 'replacement', 'Sensor was defective from manufacturer', '#991b1b'),
  ('Early Failure', 'replacement', 'Sensor failed before expected lifespan', '#c2410c'),
  ('Warranty Claim', 'replacement', 'Submitted warranty claim for replacement', '#a16207'),
  ('Damaged Packaging', 'physical', 'Sensor packaging was damaged upon receipt', '#b45309'),
  ('Insertion Problems', 'physical', 'Difficulty inserting sensor or applicator issues', '#9333ea'),
  ('Painful Insertion', 'physical', 'Sensor insertion was more painful than usual', '#c026d3'),
  ('User Error', 'usage', 'Removed accidentally or due to user mistake', '#059669'),
  ('Lifestyle Conflict', 'usage', 'Sensor interfered with daily activities', '#0d9488'),
  ('Comfort Issues', 'usage', 'Sensor was uncomfortable or irritating', '#0891b2'),
  ('Good Performance', 'positive', 'Sensor worked well throughout its lifespan', '#16a34a'),
  ('Expired', 'lifecycle', 'Sensor reached end of normal lifespan', '#6b7280'),
  ('Other', 'general', 'Other issue not covered by standard categories', '#4b5563')
ON CONFLICT (name) DO NOTHING;