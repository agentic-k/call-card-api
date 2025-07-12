-- Migration: 20250712XXXXXX_recreate_user_google_tokens.sql (replace XXXXXX with actual timestamp)

-- Drop existing table if it exists (safe since no data exists)
DROP TABLE IF EXISTS public.user_google_tokens;

-- Create the user_google_tokens table with updated schema
CREATE TABLE public.user_google_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed to public.profiles(id) for consistency
  google_refresh_token TEXT NOT NULL, -- Renamed for clarity and consistency
  google_access_token TEXT, -- NEW: Stores the current access token
  access_token_expires_at TIMESTAMPTZ, -- NEW: Stores when the access token expires
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on the new table
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_google_tokens
-- Allow users to SELECT their own token (primarily for backend access via service key)
CREATE POLICY "Users can view their own Google tokens."
ON public.user_google_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own token (primarily by backend)
CREATE POLICY "Users can insert their own Google tokens."
ON public.user_google_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own token (primarily by backend for token refresh)
CREATE POLICY "Users can update their own Google tokens."
ON public.user_google_tokens FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own token (e.g., on account unlink)
CREATE POLICY "Users can delete their own Google tokens."
ON public.user_google_tokens FOR DELETE
USING (user_id = auth.uid());

-- Trigger to automatically update `updated_at` timestamp
-- (Assuming public.handle_updated_at function already exists from your previous migration)
-- If not, you'll need to include its definition here:
/*
create or replace function public.handle_updated_at()
  returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;
*/
CREATE TRIGGER set_user_google_tokens_updated_at
BEFORE UPDATE ON public.user_google_tokens
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
