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

-- Photo deletion cleanup will be handled by application logic when needed