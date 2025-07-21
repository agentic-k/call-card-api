-- Ensure UUID extension is enabled if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--
-- Table: public.calendar_events
-- Stores replicated Google Calendar event data for each user.
--
CREATE TABLE public.calendar_events (
    id TEXT PRIMARY KEY, -- Google Event ID (unique per event across all calendars)
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Foreign key to the profiles table
    calendar_id TEXT NOT NULL, -- The specific Google Calendar ID this event belongs to
    title TEXT,
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status TEXT, -- e.g., 'confirmed', 'cancelled', 'tentative'
    html_link TEXT, -- Link to the event in Google Calendar
    etag TEXT, -- Google's ETag for optimistic concurrency control
    last_modified TIMESTAMPTZ, -- Timestamp of the last update from Google Calendar
    raw_event_data JSONB, -- Stores the full JSON object from Google Calendar for flexibility
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Ensure a user cannot have duplicate Google Calendar event IDs
    CONSTRAINT unique_user_event UNIQUE (user_id, id)
);

-- Index for faster lookups by user and calendar
CREATE INDEX idx_calendar_events_user_id_calendar_id ON public.calendar_events (user_id, calendar_id);
-- Index for efficient time-based queries
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events (start_time);


-- Enable Row Level Security for calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only view their own calendar events
CREATE POLICY "Users can view their own calendar events."
ON public.calendar_events FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can insert their own calendar events (primarily by backend, but good for consistency)
CREATE POLICY "Users can insert their own calendar events."
ON public.calendar_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own calendar events (primarily by backend)
CREATE POLICY "Users can update their own calendar events."
ON public.calendar_events FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own calendar events (primarily by backend)
CREATE POLICY "Users can delete their own calendar events."
ON public.calendar_events FOR DELETE
USING (auth.uid() = user_id);


--
-- Table: public.watch_channels
-- Stores metadata about active Google Calendar watch channels for each user.
--
CREATE TABLE public.watch_channels (
    channel_id TEXT PRIMARY KEY, -- Google's unique channel ID for the watch request
    resource_id TEXT NOT NULL, -- Google's unique ID for the resource being watched (e.g., calendar ID)
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Foreign key to the profiles table
    expiration_timestamp TIMESTAMPTZ NOT NULL, -- When the watch channel expires (Google default is 7 days)
    last_sync_token TEXT, -- The nextSyncToken from Google Calendar for incremental synchronization
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Ensure a user has only one watch channel per resource (e.g., per primary calendar)
    CONSTRAINT unique_user_resource_channel UNIQUE (user_id, resource_id)
);

-- Index for faster lookups by user and resource
CREATE INDEX idx_watch_channels_user_id_resource_id ON public.watch_channels (user_id, resource_id);
-- Index for efficient lookup of expiring channels
CREATE INDEX idx_watch_channels_expiration ON public.watch_channels (expiration_timestamp);


-- Enable Row Level Security for watch_channels
ALTER TABLE public.watch_channels ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only view their own watch channels
CREATE POLICY "Users can view their own watch channels."
ON public.watch_channels FOR SELECT
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can insert their own watch channels (primarily by backend)
CREATE POLICY "Users can insert their own watch channels."
ON public.watch_channels FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own watch channels (primarily by backend for renewal/sync token)
CREATE POLICY "Users can update their own watch channels."
ON public.watch_channels FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own watch channels (primarily by backend when channel is invalid)
CREATE POLICY "Users can delete their own watch channels."
ON public.watch_channels FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to automatically update `updated_at` timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_watch_channels_updated_at
BEFORE UPDATE ON public.watch_channels
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
