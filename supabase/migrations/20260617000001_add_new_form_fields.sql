-- Add new mosque fields
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS report_number TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS issue_date TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS facility_name TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS total_cases TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS evaluations JSONB DEFAULT '[]';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS positives TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS negatives TEXT DEFAULT '';

-- Add new disability fields
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS form_number TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS observation_date TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS observation_location TEXT DEFAULT '';
ALTER TABLE public.field_inspections ADD COLUMN IF NOT EXISTS researcher_notes TEXT DEFAULT '';

-- Keep old columns for backward compatibility (mosque_name, facility_evaluations, general_notes, is_permanent, uses_wheelchair)
