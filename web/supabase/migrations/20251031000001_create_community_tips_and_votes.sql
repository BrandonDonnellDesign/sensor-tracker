-- Create community_tips table
CREATE TABLE IF NOT EXISTS community_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('insertion', 'adhesion', 'longevity', 'troubleshooting', 'general')),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'System',
  is_verified BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_tip_votes table for tracking user votes
CREATE TABLE IF NOT EXISTS community_tip_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tip_id UUID REFERENCES community_tips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one vote per user per tip
  UNIQUE(tip_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_tips_category ON community_tips(category);
CREATE INDEX IF NOT EXISTS idx_community_tips_created_at ON community_tips(created_at);
CREATE INDEX IF NOT EXISTS idx_community_tips_author ON community_tips(author_id);
CREATE INDEX IF NOT EXISTS idx_community_tip_votes_tip_id ON community_tip_votes(tip_id);
CREATE INDEX IF NOT EXISTS idx_community_tip_votes_user_id ON community_tip_votes(user_id);

-- Create a view for tips with vote counts (replace if exists)
CREATE OR REPLACE VIEW community_tips_with_stats 
WITH (security_invoker = true) AS
SELECT 
  ct.*,
  COALESCE(vote_stats.upvotes, 0) as upvotes,
  COALESCE(vote_stats.downvotes, 0) as downvotes,
  COALESCE(vote_stats.upvotes, 0) - COALESCE(vote_stats.downvotes, 0) as net_votes
FROM community_tips ct
LEFT JOIN (
  SELECT 
    tip_id,
    COUNT(CASE WHEN vote_type = 'up' THEN 1 END) as upvotes,
    COUNT(CASE WHEN vote_type = 'down' THEN 1 END) as downvotes
  FROM community_tip_votes
  GROUP BY tip_id
) vote_stats ON ct.id = vote_stats.tip_id
WHERE ct.is_deleted = FALSE;

-- Function to get user's vote for a specific tip
CREATE OR REPLACE FUNCTION get_user_vote_for_tip(tip_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT vote_type 
    FROM community_tip_votes 
    WHERE tip_id = tip_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle user vote
CREATE OR REPLACE FUNCTION toggle_tip_vote(tip_uuid UUID, user_uuid UUID, new_vote_type TEXT)
RETURNS JSON AS $$
DECLARE
  existing_vote TEXT;
  result JSON;
BEGIN
  -- Get existing vote
  SELECT vote_type INTO existing_vote
  FROM community_tip_votes
  WHERE tip_id = tip_uuid AND user_id = user_uuid;
  
  IF existing_vote IS NULL THEN
    -- No existing vote, create new one
    INSERT INTO community_tip_votes (tip_id, user_id, vote_type)
    VALUES (tip_uuid, user_uuid, new_vote_type);
    
    result := json_build_object(
      'action', 'added',
      'vote_type', new_vote_type,
      'previous_vote', null
    );
  ELSIF existing_vote = new_vote_type THEN
    -- Same vote type, remove the vote (toggle off)
    DELETE FROM community_tip_votes
    WHERE tip_id = tip_uuid AND user_id = user_uuid;
    
    result := json_build_object(
      'action', 'removed',
      'vote_type', null,
      'previous_vote', existing_vote
    );
  ELSE
    -- Different vote type, update the vote
    UPDATE community_tip_votes
    SET vote_type = new_vote_type, updated_at = NOW()
    WHERE tip_id = tip_uuid AND user_id = user_uuid;
    
    result := json_build_object(
      'action', 'updated',
      'vote_type', new_vote_type,
      'previous_vote', existing_vote
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE community_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_tip_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_tips
CREATE POLICY "Anyone can view non-deleted tips" ON community_tips
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can create tips" ON community_tips
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own tips" ON community_tips
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can soft delete their own tips" ON community_tips
  FOR UPDATE USING (auth.uid() = author_id AND is_deleted = TRUE);

-- RLS Policies for community_tip_votes
CREATE POLICY "Users can view all votes" ON community_tip_votes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage their own votes" ON community_tip_votes
  FOR ALL USING (auth.uid() = user_id);

-- Insert some sample tips
INSERT INTO community_tips (title, content, category, author_name, is_verified, tags) VALUES
('Skin prep is everything!', 'Clean with alcohol, let it dry completely, then use Skin Tac. My sensors now last the full 10 days consistently.', 'insertion', 'Sarah M.', TRUE, ARRAY['skin-prep', 'adhesion', 'longevity']),
('Rotate insertion sites religiously', 'Keep a simple rotation chart. Arms, abdomen, thighs - never the same spot twice in a row. Prevents scar tissue buildup.', 'insertion', 'Mike D.', FALSE, ARRAY['rotation', 'site-selection', 'health']),
('Compression shorts for active users', 'For thigh sensors, compression shorts keep everything in place during workouts. No more sensors falling off during exercise!', 'adhesion', 'Alex R.', TRUE, ARRAY['exercise', 'adhesion', 'clothing']),
('Temperature matters for adhesive', 'Warm the sensor to room temperature before applying. Cold adhesive doesn''t stick as well. Keep it in your pocket for 10 minutes first.', 'insertion', 'Jessica L.', FALSE, ARRAY['temperature', 'adhesive', 'preparation']),
('Troubleshooting compression lows', 'If you get compression lows while sleeping, try different sleeping positions or looser pajamas. Side sleeping can compress arm sensors.', 'troubleshooting', 'David K.', TRUE, ARRAY['compression', 'sleep', 'accuracy']),
('Shower protection technique', 'Use a waterproof patch over your sensor for showers. Remove it immediately after to let the sensor breathe.', 'adhesion', 'Emma T.', FALSE, ARRAY['waterproof', 'shower', 'protection']);

-- Add some sample votes to make it realistic
DO $$
DECLARE
  tip_record RECORD;
  user_record RECORD;
  vote_chance FLOAT;
BEGIN
  -- Get all tips and users for sample voting
  FOR tip_record IN SELECT id FROM community_tips LOOP
    FOR user_record IN SELECT id FROM auth.users LIMIT 10 LOOP
      -- 60% chance of voting
      vote_chance := random();
      IF vote_chance < 0.6 THEN
        -- 80% chance of upvote, 20% chance of downvote
        IF random() < 0.8 THEN
          INSERT INTO community_tip_votes (tip_id, user_id, vote_type)
          VALUES (tip_record.id, user_record.id, 'up')
          ON CONFLICT (tip_id, user_id) DO NOTHING;
        ELSE
          INSERT INTO community_tip_votes (tip_id, user_id, vote_type)
          VALUES (tip_record.id, user_record.id, 'down')
          ON CONFLICT (tip_id, user_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;