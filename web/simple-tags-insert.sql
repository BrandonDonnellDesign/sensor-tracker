-- Simple script to populate tags table
-- Run this in Supabase SQL Editor

-- First, let's make sure the table exists and clear any existing data
DELETE FROM public.tags;

-- Insert tags one by one to avoid any conflicts
INSERT INTO public.tags (name, category, description, color) VALUES ('Adhesive Failed', 'adhesive', 'Sensor came off due to adhesive failure', '#ef4444');
INSERT INTO public.tags (name, category, description, color) VALUES ('Poor Adhesion', 'adhesive', 'Sensor had weak adhesive from start', '#f97316');
INSERT INTO public.tags (name, category, description, color) VALUES ('Skin Reaction', 'adhesive', 'Allergic reaction or skin irritation from adhesive', '#eab308');
INSERT INTO public.tags (name, category, description, color) VALUES ('Fell Off Swimming', 'adhesive', 'Sensor came off while swimming or in water', '#3b82f6');
INSERT INTO public.tags (name, category, description, color) VALUES ('Fell Off Exercise', 'adhesive', 'Sensor came off during physical activity', '#8b5cf6');

INSERT INTO public.tags (name, category, description, color) VALUES ('Signal Lost', 'device_error', 'Sensor stopped transmitting data', '#dc2626');
INSERT INTO public.tags (name, category, description, color) VALUES ('Inaccurate Readings', 'device_error', 'Sensor providing incorrect glucose values', '#ea580c');
INSERT INTO public.tags (name, category, description, color) VALUES ('Sensor Error', 'device_error', 'General sensor malfunction or error message', '#d97706');
INSERT INTO public.tags (name, category, description, color) VALUES ('Bluetooth Issues', 'device_error', 'Connection problems with phone/receiver', '#2563eb');
INSERT INTO public.tags (name, category, description, color) VALUES ('Calibration Problems', 'device_error', 'Sensor requiring excessive calibration', '#7c3aed');

INSERT INTO public.tags (name, category, description, color) VALUES ('Defective Unit', 'replacement', 'Sensor was defective from manufacturer', '#991b1b');
INSERT INTO public.tags (name, category, description, color) VALUES ('Early Failure', 'replacement', 'Sensor failed before expected lifespan', '#c2410c');
INSERT INTO public.tags (name, category, description, color) VALUES ('Warranty Claim', 'replacement', 'Submitted warranty claim for replacement', '#a16207');

INSERT INTO public.tags (name, category, description, color) VALUES ('Damaged Packaging', 'physical', 'Sensor packaging was damaged upon receipt', '#b45309');
INSERT INTO public.tags (name, category, description, color) VALUES ('Insertion Problems', 'physical', 'Difficulty inserting sensor or applicator issues', '#9333ea');
INSERT INTO public.tags (name, category, description, color) VALUES ('Painful Insertion', 'physical', 'Sensor insertion was more painful than usual', '#c026d3');

INSERT INTO public.tags (name, category, description, color) VALUES ('User Error', 'usage', 'Removed accidentally or due to user mistake', '#059669');
INSERT INTO public.tags (name, category, description, color) VALUES ('Lifestyle Conflict', 'usage', 'Sensor interfered with daily activities', '#0d9488');
INSERT INTO public.tags (name, category, description, color) VALUES ('Comfort Issues', 'usage', 'Sensor was uncomfortable or irritating', '#0891b2');

INSERT INTO public.tags (name, category, description, color) VALUES ('Good Performance', 'positive', 'Sensor worked well throughout its lifespan', '#16a34a');
INSERT INTO public.tags (name, category, description, color) VALUES ('Expired', 'lifecycle', 'Sensor reached end of normal lifespan', '#6b7280');
INSERT INTO public.tags (name, category, description, color) VALUES ('Other', 'general', 'Other issue not covered by standard categories', '#4b5563');

-- Verify the data was inserted
SELECT COUNT(*) as tag_count FROM public.tags;
SELECT category, COUNT(*) as count FROM public.tags GROUP BY category ORDER BY category;