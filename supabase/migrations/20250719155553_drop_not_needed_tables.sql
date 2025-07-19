-- migrations/20250719210500_drop_checkpoints_meetings_transcripts_and_policies.sql

-- UP MIGRATION: Drop tables and their policies

-- --- Drop 'checkpoints' table and its policies ---
-- 1. Disable RLS for 'checkpoints' table
ALTER TABLE public.checkpoints DISABLE ROW LEVEL SECURITY;

-- 2. Drop all policies associated with 'checkpoints'
DROP POLICY IF EXISTS "Allow read checkpoints of owned meetings" ON public.checkpoints;
DROP POLICY IF EXISTS "Allow insert checkpoints into owned meetings" ON public.checkpoints;
DROP POLICY IF EXISTS "Allow update checkpoints of owned meetings" ON public.checkpoints;
DROP POLICY IF EXISTS "Allow delete checkpoints of owned meetings" ON public.checkpoints;

-- 3. Drop the 'checkpoints' table itself
-- IMPORTANT: Consider foreign key constraints.
-- If other tables have foreign keys referencing 'checkpoints',
-- this command will fail unless those foreign keys are dropped first,
-- or you use CASCADE. If you use CASCADE, be extremely careful.
DROP TABLE IF EXISTS public.checkpoints;
-- OR (USE WITH EXTREME CAUTION IF YOU'RE SURE):
-- DROP TABLE IF EXISTS public.checkpoints CASCADE;


-- --- Drop 'transcripts' table and its policies ---
-- 1. Disable RLS for 'transcripts' table
ALTER TABLE public.transcripts DISABLE ROW LEVEL SECURITY;

-- 2. Drop all policies associated with 'transcripts'
DROP POLICY IF EXISTS "Allow read transcripts of owned meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Allow insert transcripts into owned meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Allow update transcripts of owned meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Allow delete transcripts of owned meetings" ON public.transcripts;

-- 3. Drop the 'transcripts' table itself
-- IMPORTANT: This table might be referenced by 'meetings' (if 'transcripts' has a meeting_id).
-- If 'transcripts' has a foreign key to 'meetings', ensure this table is dropped before 'meetings'
-- or use CASCADE carefully.
DROP TABLE IF EXISTS public.transcripts;
-- OR (USE WITH EXTREME CAUTION IF YOU'RE SURE):
-- DROP TABLE IF EXISTS public.transcripts CASCADE;


-- --- Drop 'meetings' table and its policies ---
-- 1. Disable RLS for 'meetings' table
ALTER TABLE public.meetings DISABLE ROW LEVEL SECURITY;

-- 2. Drop all policies associated with 'meetings'
DROP POLICY IF EXISTS "Allow meeting owners to read" ON public.meetings;
DROP POLICY IF EXISTS "Allow owners to insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Allow owners to update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Allow owners to delete meetings" ON public.meetings;

-- 3. Drop the 'meetings' table itself
-- IMPORTANT: This table might be referenced by 'checkpoints' and 'transcripts'.
-- Since 'checkpoints' and 'transcripts' are dropped *before* 'meetings' in this migration,
-- any foreign keys from them to 'meetings' should no longer be an issue here.
-- Using CASCADE here is also an option, but again, use with extreme caution.
DROP TABLE IF EXISTS public.meetings;
-- OR (USE WITH EXTREME CAUTION IF YOU'RE SURE):
-- DROP TABLE IF EXISTS public.meetings CASCADE;


DROP TABLE IF EXISTS public.user_teams;
DROP TABLE IF EXISTS public.teams;