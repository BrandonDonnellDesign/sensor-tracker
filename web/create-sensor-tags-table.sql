-- Create the sensor_tags junction table if it doesn't exist
-- This table links sensors to their tags

-- Create sensor_tags table
CREATE TABLE IF NOT EXISTS public.sensor_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sensor_id, tag_id)
);

-- Enable RLS on sensor_tags table
ALTER TABLE public.sensor_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sensor_tags (users can only see their own sensor tags)
CREATE POLICY "Users can view their sensor tags" ON public.sensor_tags
    FOR SELECT 
    TO authenticated 
    USING (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their sensor tags" ON public.sensor_tags
    FOR ALL 
    TO authenticated 
    USING (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = auth.uid()
        )
    );

-- Test that we can query the table
SELECT COUNT(*) as sensor_tags_count FROM public.sensor_tags;