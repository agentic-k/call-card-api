-- handle_new_auth_user: insert into profiles when a new auth.users row appears
create or replace function public.handle_new_auth_user()
  returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    (new.raw_user_meta_data->>'full_name')::text,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- attach that function as a trigger on auth.users
create trigger create_profile_after_signup
  after insert on auth.users
  for each row
  execute procedure public.handle_new_auth_user();
