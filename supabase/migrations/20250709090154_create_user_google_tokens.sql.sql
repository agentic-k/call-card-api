-- 20250709090154_create_user_google_tokens.sql

-- Create a function to update the updated_at column
create or replace function public.handle_updated_at()
  returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Create the user_google_tokens table
create table if not exists public.user_google_tokens (
  user_id       uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Add a trigger to automatically update updated_at on row updates
create trigger on_user_google_tokens_updated
  before update on public.user_google_tokens
  for each row
  execute procedure public.handle_updated_at();

-- Enable RLS on the new table
alter table public.user_google_tokens enable row level security;

-- RLS Policies for user_google_tokens
-- Allow users to SELECT their own token
create policy "Allow users to select their own token"
  on public.user_google_tokens
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );

-- Allow users to INSERT their own token
create policy "Allow users to insert their own token"
  on public.user_google_tokens
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

-- Allow users to UPDATE their own token
create policy "Allow users to update their own token"
  on public.user_google_tokens
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );

-- Allow users to DELETE their own token
create policy "Allow users to delete their own token"
  on public.user_google_tokens
  for delete
  to authenticated
  using (
    user_id = auth.uid()
  ); 