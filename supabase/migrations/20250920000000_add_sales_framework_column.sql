-- Add sales_framework column to templates table
ALTER TABLE public.templates
ADD COLUMN sales_framework JSONB;

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.templates.sales_framework IS 'Stores sales framework data like MEDDIC, SPIN, etc. with framework name, description and question content';

-- Create index for better performance when querying by sales_framework properties
CREATE INDEX idx_templates_sales_framework ON public.templates USING gin (sales_framework);
