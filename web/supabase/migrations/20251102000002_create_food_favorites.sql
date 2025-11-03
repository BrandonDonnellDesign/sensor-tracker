-- Create food_favorites table for user's favorite foods
CREATE TABLE IF NOT EXISTS food_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    favorite_name TEXT, -- Custom name for this favorite
    default_quantity DECIMAL(10,2) DEFAULT 100, -- Default serving size
    usage_count INTEGER DEFAULT 0, -- How many times this favorite has been used
    last_used TIMESTAMPTZ, -- When this favorite was last used for logging
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't favorite the same food item twice
    UNIQUE(user_id, food_item_id)
);

-- Create indexes for better performance
CREATE INDEX idx_food_favorites_user_id ON food_favorites(user_id);
CREATE INDEX idx_food_favorites_usage_count ON food_favorites(user_id, usage_count DESC);
CREATE INDEX idx_food_favorites_last_used ON food_favorites(user_id, last_used DESC);

-- Add RLS policies
ALTER TABLE food_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only access their own favorites
CREATE POLICY "Users can view their own favorites" ON food_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON food_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON food_favorites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON food_favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update usage count and last_used timestamp
CREATE OR REPLACE FUNCTION increment_favorite_usage(favorite_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE food_favorites 
    SET 
        usage_count = usage_count + 1,
        last_used = NOW(),
        updated_at = NOW()
    WHERE id = favorite_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's most used favorites
CREATE OR REPLACE FUNCTION get_top_favorites(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    food_item_id UUID,
    favorite_name TEXT,
    default_quantity DECIMAL,
    usage_count INTEGER,
    last_used TIMESTAMPTZ,
    food_name TEXT,
    food_brand TEXT,
    carbs_per_100g DECIMAL,
    calories_per_100g DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ff.id,
        ff.food_item_id,
        ff.favorite_name,
        ff.default_quantity,
        ff.usage_count,
        ff.last_used,
        fi.name as food_name,
        fi.brand as food_brand,
        fi.carbs_per_100g,
        fi.calories_per_100g
    FROM food_favorites ff
    JOIN food_items fi ON ff.food_item_id = fi.id
    WHERE ff.user_id = user_uuid
    ORDER BY ff.usage_count DESC, ff.last_used DESC NULLS LAST
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add barcode column to food_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'food_items' AND column_name = 'barcode') THEN
        ALTER TABLE food_items ADD COLUMN barcode TEXT;
        CREATE INDEX idx_food_items_barcode ON food_items(barcode) WHERE barcode IS NOT NULL;
    END IF;
END $$;

-- Add verification fields to food_items for external API data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'food_items' AND column_name = 'is_verified') THEN
        ALTER TABLE food_items ADD COLUMN is_verified BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'food_items' AND column_name = 'created_by') THEN
        ALTER TABLE food_items ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Function to get tip vote counts (for community voting)
CREATE OR REPLACE FUNCTION get_tip_vote_counts(tip_id UUID)
RETURNS JSON AS $$
DECLARE
    upvotes INTEGER;
    downvotes INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvotes, downvotes
    FROM community_tip_votes 
    WHERE tip_id = get_tip_vote_counts.tip_id;
    
    RETURN json_build_object(
        'upvotes', COALESCE(upvotes, 0),
        'downvotes', COALESCE(downvotes, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;