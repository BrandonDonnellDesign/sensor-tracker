-- Create roadmap tables for dynamic management

-- Main roadmap items table
CREATE TABLE roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(100) UNIQUE NOT NULL, -- Human-readable ID like 'mobile-app'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'in-progress', 'planned', 'future')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('core', 'analytics', 'integrations', 'mobile', 'ai', 'social', 'security')),
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  estimated_quarter VARCHAR(10) NOT NULL,
  icon_name VARCHAR(50) NOT NULL, -- Lucide icon name
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Roadmap item features
CREATE TABLE roadmap_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  feature_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roadmap item dependencies
CREATE TABLE roadmap_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  depends_on_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, depends_on_id)
);

-- Roadmap item tags
CREATE TABLE roadmap_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
  tag_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roadmap_item_id, tag_name)
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON roadmap_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tags ENABLE ROW LEVEL SECURITY;

-- Public read access for roadmap items
CREATE POLICY "Roadmap items are viewable by everyone" ON roadmap_items
    FOR SELECT USING (true);

CREATE POLICY "Roadmap features are viewable by everyone" ON roadmap_features
    FOR SELECT USING (true);

CREATE POLICY "Roadmap dependencies are viewable by everyone" ON roadmap_dependencies
    FOR SELECT USING (true);

CREATE POLICY "Roadmap tags are viewable by everyone" ON roadmap_tags
    FOR SELECT USING (true);

-- Admin write access (you can modify this based on your admin system)
CREATE POLICY "Admins can manage roadmap items" ON roadmap_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage roadmap features" ON roadmap_features
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage roadmap dependencies" ON roadmap_dependencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage roadmap tags" ON roadmap_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Add role column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Create indexes for performance
CREATE INDEX idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX idx_roadmap_items_category ON roadmap_items(category);
CREATE INDEX idx_roadmap_items_sort_order ON roadmap_items(sort_order);
CREATE INDEX idx_roadmap_features_roadmap_item_id ON roadmap_features(roadmap_item_id);
CREATE INDEX idx_roadmap_dependencies_item_id ON roadmap_dependencies(item_id);
CREATE INDEX idx_roadmap_tags_roadmap_item_id ON roadmap_tags(roadmap_item_id);