-- Enable RLS on the storage.objects table (if not already enabled)
alter table storage.objects enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can upload their own sensor photos" on storage.objects;
drop policy if exists "Users can view their own sensor photos" on storage.objects;
drop policy if exists "Users can delete their own sensor photos" on storage.objects;

-- Policy to allow users to upload their own sensor photos
create policy "Users can upload their own sensor photos"
on storage.objects for insert
with check (
    bucket_id = 'sensor_photos' 
    and position(auth.uid()::text in name) = 1
);

-- Policy to allow users to view their own sensor photos
create policy "Users can view their own sensor photos"
on storage.objects for select
using (
    bucket_id = 'sensor_photos' 
    and position(auth.uid()::text in name) = 1
);

-- Policy to allow users to delete their own sensor photos
create policy "Users can delete their own sensor photos"
on storage.objects for delete
using (
    bucket_id = 'sensor_photos' 
    and position(auth.uid()::text in name) = 1
);