-- Supabase tables for Vital integration (simplified)

-- Table to store wearable data for each user
CREATE TABLE IF NOT EXISTS wearables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vital_user_id text,
  status text DEFAULT 'pending',
  access_token text,
  link_url text,
  connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Health data fields
  steps integer,
  heart_rate integer,
  sleep_hours numeric,
  calories integer,
  distance numeric,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  basal_body_temperature numeric,
  body_mass_index numeric,
  glucose numeric,
  stress_level integer,
  workout_duration integer,
  body_temperature numeric,
  
  -- Metadata
  last_event text,
  last_updated timestamptz,
  device_type text,
  
  -- Unparsed data (JSONB for flexibility)
  unparsed_data jsonb,
  
  UNIQUE(user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wearables_user_id ON wearables(user_id);
CREATE INDEX IF NOT EXISTS idx_wearables_vital_user_id ON wearables(vital_user_id);

-- Disable RLS for easier development (less secure but easier to use)
ALTER TABLE wearables DISABLE ROW LEVEL SECURITY;

-- Add vital_user_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS vital_user_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vital_linked_at timestamptz; 