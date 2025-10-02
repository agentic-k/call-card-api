-- Migration to add callcard_id to calendar_events table
-- This migration adds a proper foreign key relationship between calendar_events and callcard tables

-- Add callcard_id column to calendar_events table
ALTER TABLE public.calendar_events
ADD COLUMN callcard_id UUID NULL;

-- Add foreign key constraint
ALTER TABLE public.calendar_events
ADD CONSTRAINT calendar_events_callcard_id_fkey
FOREIGN KEY (callcard_id)
REFERENCES public.callcard(callcard_id)
ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_calendar_events_callcard_id ON public.calendar_events(callcard_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.calendar_events.callcard_id IS 'Reference to the callcard associated with this event';

-- Migrate existing relationships
-- This will copy template_id values to callcard_id where the template_id is actually referencing a callcard
UPDATE public.calendar_events
SET callcard_id = template_id
WHERE template_id IN (SELECT callcard_id FROM public.callcard);

-- Add a trigger to sync callcard_id from template_id when template_id is updated
-- But only if the template_id value exists in the callcard table
CREATE OR REPLACE FUNCTION public.sync_template_to_callcard_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If template_id is being updated and it references a callcard, also update callcard_id
  IF TG_OP = 'UPDATE' AND NEW.template_id IS DISTINCT FROM OLD.template_id THEN
    IF EXISTS (SELECT 1 FROM public.callcard WHERE callcard_id = NEW.template_id) THEN
      NEW.callcard_id = NEW.template_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_template_to_callcard_id_trigger
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.sync_template_to_callcard_id();
