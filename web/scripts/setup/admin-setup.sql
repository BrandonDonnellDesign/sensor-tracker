-- Admin User Setup Script
-- Consolidates admin configuration scripts

-- Set usernames for admin users based on email if not set
UPDATE public.profiles 
SET username = split_part(au.email, '@', 1)
FROM auth.users au
WHERE profiles.id = au.id
AND (profiles.username IS NULL OR profiles.username = '') 
AND au.email IS NOT NULL 
AND au.email != '';

-- Set specific admin roles and usernames
-- REPLACE THESE EMAIL ADDRESSES WITH YOUR ACTUAL ADMIN EMAILS
UPDATE public.profiles 
SET 
  role = 'admin',
  username = 'admin',
  is_admin = true,
  can_moderate = true,
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-admin-email@example.com'  -- REPLACE THIS
);

-- Set moderator roles
UPDATE public.profiles 
SET 
  role = 'moderator',
  username = 'moderator',
  can_moderate = true,
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-moderator-email@example.com'  -- REPLACE THIS
);

-- Create profiles for admin users if they don't exist
INSERT INTO public.profiles (id, email, role, username, is_admin, can_moderate)
SELECT 
  u.id,
  u.email,
  'admin',
  'admin',
  true,
  true
FROM auth.users u
WHERE u.email = 'your-admin-email@example.com'  -- REPLACE THIS
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Show current admin users
SELECT 
  p.id,
  au.email,
  p.username,
  p.role,
  p.is_admin,
  p.can_moderate,
  COALESCE(
    p.username, 
    p.full_name, 
    CASE 
      WHEN au.email IS NOT NULL THEN split_part(au.email, '@', 1)
      ELSE CONCAT('User-', SUBSTRING(p.id::text, 1, 8))
    END
  ) as display_name
FROM public.profiles p 
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.role IN ('admin', 'moderator')
ORDER BY au.email;

-- Admin users configured successfully!
-- Remember to update the email addresses in this script for your actual admin users.