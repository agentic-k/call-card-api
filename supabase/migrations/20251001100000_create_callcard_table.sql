-- Create the callcard table to store information for meeting preparations.
CREATE TABLE public.callcard (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    callcard_name text NOT NULL,
    user_id uuid NOT NULL,
    calendar_event_id text,
    person_name text NOT NULL,
    person_title text,
    company_name text,
    company_funding_stage text,
    company_employee_count integer,
    company_valuation bigint,
    key_opportunity text,
    talk_about text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT callcard_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT callcard_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES public.calendar_events(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.callcard IS 'Stores call preparation information for a meeting, as a v2 of the templates table.';
COMMENT ON COLUMN public.callcard.company_valuation IS 'Company valuation or funding in USD, stored as a whole number (e.g., 25000000 for $25M).';

-- Add indexes for performance
CREATE INDEX idx_callcard_user_id ON public.callcard(user_id);
CREATE INDEX idx_callcard_calendar_event_id ON public.callcard(calendar_event_id);

-- Set up row-level security
ALTER TABLE public.callcard ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- This policy allows users to perform all actions (SELECT, INSERT, UPDATE, DELETE) on their own callcards.
CREATE POLICY "Users can manage their own callcards"
ON public.callcard
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
-- This function is reusable, but we use CREATE OR REPLACE to ensure it's defined.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_callcard_updated
BEFORE UPDATE ON public.callcard
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Grant usage to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.callcard TO authenticated;
GRANT ALL ON TABLE public.callcard TO service_role;
