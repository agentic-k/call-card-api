-- migrations/20250719210900_drop_all_tables_and_policies_v2.sql

-- UP MIGRATION: Drop tables and their policies - Adjusted Order

-- --- Drop deepest child tables first to respect foreign key constraints ---

-- 1. Drop 'user_teams' table (references 'teams' and 'profiles')
DROP TABLE IF EXISTS public.user_teams;

-- 2. Drop policies and then 'checkpoints' table (references 'meetings')
ALTER TABLE public.checkpoints DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read checkpoints of owned meetings" ON public.checkpoints;
DROP POLICY IF EXISTS "Allow insert checkpoints into owned meetings" ON public.checkpoints;
DROP POLICY IF EXISTS "Allow update checkpoints of owned meetings" ON public.checkpoints;
DROP POLICY IF EXISTS "Allow delete checkpoints of owned meetings" ON public.checkpoints;
DROP TABLE IF EXISTS public.checkpoints;

-- 3. Drop policies and then 'transcripts' table (references 'meetings')
ALTER TABLE public.transcripts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read transcripts of owned meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Allow insert transcripts into owned meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Allow update transcripts of owned meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Allow delete transcripts of owned meetings" ON public.transcripts;
DROP TABLE IF EXISTS public.transcripts;


-- --- Now drop tables that are parents to the ones above, but children to others ---

-- 4. Drop policies and then 'meetings' table (references 'templates', 'teams', 'profiles')
-- Its children ('checkpoints' and 'transcripts') are already dropped.
ALTER TABLE public.meetings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow meeting owners to read" ON public.meetings;
DROP POLICY IF EXISTS "Allow owners to insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Allow owners to update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Allow owners to delete meetings" ON public.meetings;
DROP TABLE IF EXISTS public.meetings;


-- 5. Drop policies and then 'templates' table (references 'teams', 'profiles')
-- 'meetings' (which referenced 'templates') is now dropped.
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;
-- Add DROP POLICY statements for 'templates' here if they exist.
-- Example: DROP POLICY IF EXISTS "some_template_policy" ON public.templates;
DROP TABLE IF EXISTS public.templates;


-- --- Finally, drop 'teams' table (parent to 'user_teams', 'meetings', and 'templates') ---

-- 6. Drop 'teams' table (all tables that referenced it are now dropped)
DROP TABLE IF EXISTS public.teams;

