-- Migration to rename 'id' column to 'callcard_id' in callcard table
-- and add the same relationship pattern as templates table

-- First, drop existing foreign key constraints that reference the callcard table's id column
ALTER TABLE public.callcard DROP CONSTRAINT IF EXISTS callcard_user_id_fkey;
ALTER TABLE public.callcard DROP CONSTRAINT IF EXISTS callcard_calendar_event_id_fkey;

-- Drop existing indexes that might reference the id column
DROP INDEX IF EXISTS idx_callcard_user_id;
DROP INDEX IF EXISTS idx_callcard_calendar_event_id;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can manage their own callcards" ON public.callcard;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_callcard_updated ON public.callcard;

-- Rename the primary key column from 'id' to 'callcard_id'
ALTER TABLE public.callcard RENAME COLUMN id TO callcard_id;

-- Recreate foreign key constraints
ALTER TABLE public.callcard ADD CONSTRAINT callcard_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
ALTER TABLE public.callcard ADD CONSTRAINT callcard_calendar_event_id_fkey 
    FOREIGN KEY (calendar_event_id) REFERENCES public.calendar_events(id) ON DELETE SET NULL;

-- Recreate indexes
CREATE INDEX idx_callcard_user_id ON public.callcard(user_id);
CREATE INDEX idx_callcard_calendar_event_id ON public.callcard(calendar_event_id);

-- Recreate RLS policies
CREATE POLICY "Users can manage their own callcards"
ON public.callcard
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate the trigger for updated_at
CREATE TRIGGER on_callcard_updated
BEFORE UPDATE ON public.callcard
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Ensure callcard_name column exists (if it doesn't already)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'callcard' 
        AND column_name = 'callcard_name'
    ) THEN
        ALTER TABLE public.callcard ADD COLUMN callcard_name text NOT NULL DEFAULT 'Untitled Call Card';
        
        -- Remove the default constraint after adding the column
        ALTER TABLE public.callcard ALTER COLUMN callcard_name DROP DEFAULT;
    END IF;
END $$;

-- Add comment for the new column
COMMENT ON COLUMN public.callcard.callcard_name IS 'Name of the call card for easy identification';

-- Update grants to ensure authenticated users have proper access
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.callcard TO authenticated;
GRANT ALL ON TABLE public.callcard TO service_role;
