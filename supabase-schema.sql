-- Create field_inspections table
CREATE TABLE IF NOT EXISTS field_inspections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visit_date DATE NOT NULL,
  facility_name TEXT NOT NULL,
  region TEXT,
  facility_type TEXT,
  cases_count INTEGER DEFAULT 0,
  evaluation_data JSONB DEFAULT '{}',
  positives TEXT,
  negatives TEXT,
  recommendations TEXT,
  final_classification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE field_inspections ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust as needed)
CREATE POLICY "Allow all" ON field_inspections
  FOR ALL
  USING (true)
  WITH CHECK (true);
