-- =====================================
-- 1) (Optional) Ensure pgcrypto extension
-- =====================================
-- Uncomment if you haven't enabled pgcrypto:
-- create extension if not exists "pgcrypto";

-- =====================================
-- 2) Enable RLS & Create Policies on the templates table
-- =====================================
alter table public.templates enable row level security;

-- SELECT
create policy "Allow template owners to read"
  on public.templates
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );

-- INSERT
create policy "Allow owners to insert templates"
  on public.templates
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

-- UPDATE
create policy "Allow owners to update templates"
  on public.templates
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );

-- DELETE
create policy "Allow owners to delete templates"
  on public.templates
  for delete
  to authenticated
  using (
    user_id = auth.uid()
  );

-- =====================================
-- 3) Enable RLS & Create Policies on the meetings table
-- =====================================
alter table public.meetings enable row level security;

-- SELECT
create policy "Allow meeting owners to read"
  on public.meetings
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );

-- INSERT
create policy "Allow owners to insert meetings"
  on public.meetings
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

-- UPDATE
create policy "Allow owners to update meetings"
  on public.meetings
  for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );

-- DELETE
create policy "Allow owners to delete meetings"
  on public.meetings
  for delete
  to authenticated
  using (
    user_id = auth.uid()
  );

-- =====================================
-- 4) Enable RLS & Create Policies on the transcripts table
--  (transcripts reference meeting_id → user_id)
-- =====================================
alter table public.transcripts enable row level security;

-- SELECT
create policy "Allow read transcripts of owned meetings"
  on public.transcripts
  for select
  to authenticated
  using (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- INSERT
create policy "Allow insert transcripts into owned meetings"
  on public.transcripts
  for insert
  to authenticated
  with check (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- UPDATE
create policy "Allow update transcripts of owned meetings"
  on public.transcripts
  for update
  to authenticated
  using (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  )
  with check (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- DELETE
create policy "Allow delete transcripts of owned meetings"
  on public.transcripts
  for delete
  to authenticated
  using (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- =====================================
-- 5) Enable RLS & Create Policies on the checkpoints table
--  (checkpoints reference meeting_id → user_id)
-- =====================================
alter table public.checkpoints enable row level security;

-- SELECT
create policy "Allow read checkpoints of owned meetings"
  on public.checkpoints
  for select
  to authenticated
  using (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- INSERT
create policy "Allow insert checkpoints into owned meetings"
  on public.checkpoints
  for insert
  to authenticated
  with check (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- UPDATE
create policy "Allow update checkpoints of owned meetings"
  on public.checkpoints
  for update
  to authenticated
  using (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  )
  with check (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- DELETE
create policy "Allow delete checkpoints of owned meetings"
  on public.checkpoints
  for delete
  to authenticated
  using (
    meeting_id in (
      select meeting_id
      from public.meetings
      where user_id = auth.uid()
    )
  );

-- =====================================
-- Done!
-- =====================================
