-- Create a new ENUM type to represent the possible statuses of a template.
-- This allows for tracking the template's lifecycle from draft to active use.
CREATE TYPE public.template_status AS ENUM (
    'DRAFT',                      -- The template is being created and is not yet ready for use.
    'AGENT_ASSISTANCE_REQUESTED', -- The user has requested help from an agent to create the template.
    'AGENT_CALL_SCHEDULED',       -- A call with an agent has been scheduled to work on the template.
    'IN_REVIEW',                  -- The template is complete but pending final review or approval.
    'ACTIVE',                     -- The template is approved and ready to be used for creating calendar events.
    'ARCHIVED',                   -- The template is no longer in active use but is kept for records.
    'ERROR'                       -- An error occurred during the creation or update process.
);

-- Alter the existing 'templates' table to add the new status columns.
ALTER TABLE public.templates
ADD COLUMN status public.template_status NOT NULL DEFAULT 'DRAFT',
ADD COLUMN error_message TEXT;

COMMENT ON COLUMN public.templates.status IS 'Tracks the lifecycle status of the template, from initial draft to active or archived states.';
COMMENT ON COLUMN public.templates.error_message IS 'Stores any error message that occurred during the template creation or update process.';