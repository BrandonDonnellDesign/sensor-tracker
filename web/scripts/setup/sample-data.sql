-- Sample Data Setup Script
-- Consolidates sample data creation for development

\echo 'Adding sample data for development...'

-- Sample community tips
INSERT INTO public.community_tips (
  title, 
  content, 
  category, 
  author_id, 
  moderation_status
) VALUES 
(
  'Managing Dawn Phenomenon',
  'The dawn phenomenon is a natural rise in blood sugar that occurs in the early morning. Here are some tips to manage it effectively...',
  'management',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'approved'
),
(
  'Best Snacks for Stable Blood Sugar',
  'These snacks help maintain steady glucose levels throughout the day...',
  'nutrition',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'approved'
),
(
  'Exercise and Blood Sugar',
  'How different types of exercise affect your glucose readings...',
  'exercise',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'approved'
),
(
  'Test Tip: Sensor Placement',
  'This is a test tip about proper sensor placement. Always clean the area thoroughly before applying.',
  'insertion',
  (SELECT id FROM public.profiles LIMIT 1),
  'pending'
),
(
  'Test Tip: Adhesive Issues',
  'If you are having adhesive problems, try using skin prep wipes before application.',
  'adhesion',
  (SELECT id FROM public.profiles LIMIT 1),
  'approved'
);

-- Sample comments
INSERT INTO public.community_comments (
  tip_id,
  author_id,
  content
) 
SELECT 
  ct.id,
  (SELECT id FROM public.profiles LIMIT 1),
  'Great advice! This really helped me.'
FROM public.community_tips ct
WHERE ct.title LIKE '%Dawn Phenomenon%'
LIMIT 1;

-- Sample votes
INSERT INTO public.community_votes (
  tip_id,
  user_id,
  vote_type
)
SELECT 
  ct.id,
  (SELECT id FROM public.profiles LIMIT 1),
  'up'
FROM public.community_tips ct
WHERE ct.moderation_status = 'approved'
LIMIT 2;

-- Sample notifications
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  message,
  is_read
) VALUES 
(
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'community',
  'Welcome to the Community!',
  'Start sharing tips and connecting with other users.',
  false
);

\echo 'Sample data added successfully!'
\echo 'Development environment is ready for testing.'