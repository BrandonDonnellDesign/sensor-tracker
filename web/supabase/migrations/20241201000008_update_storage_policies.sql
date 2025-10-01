-- Drop existing policies
drop policy if exists "Users can upload their own sensor photos" on storage.objects;
drop policy if exists "Users can view their own sensor photos" on storage.objects;
drop policy if exists "Users can delete their own sensor photos" on storage.objects;

-- Policy to allow users to upload sensor photos (either to their user folder or temp)
create policy "Users can upload their own sensor photos"
on storage.objects for insert
with check (
    bucket_id = 'sensor_photos' 
    and (
        position(auth.uid()::text in name) = 1
        or (
            position('temp/' in name) = 1 
            and position(auth.uid()::text in name) = 6
        )
    )
);

-- Policy to allow users to view their sensor photos (including temp)
create policy "Users can view their own sensor photos"
on storage.objects for select
using (
    bucket_id = 'sensor_photos' 
    and (
        position(auth.uid()::text in name) = 1
        or (
            position('temp/' in name) = 1 
            and position(auth.uid()::text in name) = 6
        )
    )
);

-- Policy to allow users to delete their sensor photos (including temp)
create policy "Users can delete their own sensor photos"
on storage.objects for delete
using (
    bucket_id = 'sensor_photos' 
    and (
        position(auth.uid()::text in name) = 1
        or (
            position('temp/' in name) = 1 
            and position(auth.uid()::text in name) = 6
        )
    )
);

-- Add policy to allow users to update (move/rename) their sensor photos
create policy "Users can update their own sensor photos"
on storage.objects for update
using (
    bucket_id = 'sensor_photos' 
    and (
        position(auth.uid()::text in name) = 1
        or (
            position('temp/' in name) = 1 
            and position(auth.uid()::text in name) = 6
        )
    )
)
with check (
    bucket_id = 'sensor_photos' 
    and position(auth.uid()::text in name) = 1
);