-- Create photos relation table
create table if not exists public.sensor_photos (
  id uuid default gen_random_uuid() primary key,
  sensor_id uuid references public.sensors(id) on delete cascade not null,
  file_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null
);

-- Enable Row Level Security (RLS)
alter table public.sensor_photos enable row level security;

-- Create policies
create policy "Users can view their own sensor photos"
on public.sensor_photos
for select using (
  auth.uid() = user_id
);

create policy "Users can insert their own sensor photos"
on public.sensor_photos
for insert with check (
  auth.uid() = user_id
);

create policy "Users can delete their own sensor photos"
on public.sensor_photos
for delete using (
  auth.uid() = user_id
);

-- Add function to clean up storage when photos are deleted
create or replace function public.handle_deleted_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Attempt to delete the file from storage
  -- Note: This might fail if the file doesn't exist, but we don't want to block the delete operation
  perform net.http_post(
    url := current_setting('app.settings.supabase_url') || '/storage/v1/object/sensor_photos/' || old.file_path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  
  return old;
exception
  when others then
    -- Log the error but allow the delete to proceed
    raise warning 'Failed to delete file from storage: %', sqlerrm;
    return old;
end;
$$;

-- Create trigger to clean up storage on photo deletion
drop trigger if exists on_photo_deleted on public.sensor_photos;
create trigger on_photo_deleted
  after delete on public.sensor_photos
  for each row
  execute function public.handle_deleted_photo();