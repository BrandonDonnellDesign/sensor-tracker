-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload their own food images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own food images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own food images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all food images
CREATE POLICY "Public can view food images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'food-images');
