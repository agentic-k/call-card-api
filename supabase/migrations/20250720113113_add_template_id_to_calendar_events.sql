-- Add a new column 'template_id' to the 'calendar_events' table.
-- This column will store the foreign key reference to the 'templates' table.
-- It is set to NULLABLE because the template may be generated after the event is created.
ALTER TABLE public.calendar_events
ADD COLUMN template_id UUID NULL;

-- Add a foreign key constraint to the 'calendar_events' table.
-- This creates a relationship between 'calendar_events' and 'templates',
-- ensuring that the 'template_id' in 'calendar_events' corresponds to a valid 'template_id' in 'templates'.
-- The ON DELETE SET NULL action means that if a template is deleted,
-- the 'template_id' in the corresponding calendar events will be set to NULL.
ALTER TABLE public.calendar_events
ADD CONSTRAINT calendar_events_template_id_fkey
FOREIGN KEY (template_id)
REFERENCES public.templates (template_id)
ON DELETE SET NULL;