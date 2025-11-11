-- Fix API Key User Association
-- Associates API keys with the first available user

-- Show current API keys
SELECT 
  id,
  name,
  key_prefix,
  user_id,
  is_active,
  created_at
FROM api_keys
ORDER BY created_at DESC
LIMIT 5;

-- Get the first user ID
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Get the first user from profiles
  SELECT id INTO first_user_id
  FROM profiles
  LIMIT 1;
  
  IF first_user_id IS NULL THEN
    RAISE NOTICE 'No users found in profiles table';
  ELSE
    RAISE NOTICE 'Found user ID: %', first_user_id;
    
    -- Update all API keys without a user_id
    UPDATE api_keys
    SET user_id = first_user_id
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Updated API keys with user_id';
  END IF;
END $$;

-- Verify the update
SELECT 
  id,
  name,
  key_prefix,
  user_id,
  is_active
FROM api_keys
WHERE key_prefix LIKE 'sk_%'
ORDER BY created_at DESC;
