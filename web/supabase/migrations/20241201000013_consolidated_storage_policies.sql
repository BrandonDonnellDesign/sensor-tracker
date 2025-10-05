-- Consolidated storage policies for all buckets
-- This replaces multiple storage policy migrations

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own sensor photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own sensor photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sensor photos" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.buckets;

-- Consolidated storage policies for all buckets
CREATE POLICY "storage_objects_select_policy" ON storage.objects
  FOR SELECT USING (
    -- Public access to avatars
    (bucket_id = 'avatars') OR
    -- Users can view their own sensor photos
    (bucket_id = 'sensor_photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  );

CREATE POLICY "storage_objects_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND (
      -- Users can upload to their own avatar folder
      (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
      -- Users can upload to their own sensor photos folder
      (bucket_id = 'sensor_photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
    )
  );

CREATE POLICY "storage_objects_update_policy" ON storage.objects
  FOR UPDATE USING (
    (SELECT auth.role()) = 'authenticated' AND (
      -- Users can update their own avatars
      (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
      -- Users can update their own sensor photos
      (bucket_id = 'sensor_photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
    )
  );

CREATE POLICY "storage_objects_delete_policy" ON storage.objects
  FOR DELETE USING (
    (SELECT auth.role()) = 'authenticated' AND (
      -- Users can delete their own avatars
      (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
      -- Users can delete their own sensor photos
      (bucket_id = 'sensor_photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
    )
  );

-- Storage buckets policy
CREATE POLICY "storage_buckets_policy" ON storage.buckets
  FOR ALL USING (id IN ('avatars', 'sensor_photos'));