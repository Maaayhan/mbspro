-- MBSPro Database Schema for Supabase
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create mbs_items table for Supabase
CREATE TABLE IF NOT EXISTS mbs_items (
  code VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  time_threshold INTEGER,
  flags JSONB NOT NULL DEFAULT '{}',
  mutually_exclusive_with TEXT[] DEFAULT '{}',
  reference_docs TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mbs_items_title ON mbs_items USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_mbs_items_description ON mbs_items USING GIN (to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_mbs_items_fee ON mbs_items (fee);
CREATE INDEX IF NOT EXISTS idx_mbs_items_flags ON mbs_items USING GIN (flags);
-- Trigram indexes for similarity search
CREATE INDEX IF NOT EXISTS trgm_mbs_items_title ON mbs_items USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_mbs_items_description ON mbs_items USING GIN (description gin_trgm_ops);
-- (unaccent/FTS removed; using trigram indexes for similarity search)

-- Enable Row Level Security (RLS)
ALTER TABLE mbs_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON mbs_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policy to allow read access for anonymous users
CREATE POLICY "Allow read access for anonymous users" ON mbs_items
  FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_mbs_items_updated_at
  BEFORE UPDATE ON mbs_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Similarity search function (returns rows with similarity score)
CREATE OR REPLACE FUNCTION search_mbs_items(q TEXT, limit_n INT DEFAULT 20)
RETURNS TABLE (
  code VARCHAR,
  title VARCHAR,
  description TEXT,
  fee DECIMAL,
  time_threshold INTEGER,
  flags JSONB,
  mutually_exclusive_with TEXT[],
  reference_docs TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  sim_title REAL,
  sim_desc REAL,
  sim REAL
) AS $$
DECLARE
  tokens TEXT[];
BEGIN
  -- Split query into lowercased tokens; collapse multiple spaces
  tokens := string_to_array(regexp_replace(lower(q), '\s+', ' ', 'g'), ' ');

  RETURN QUERY
  SELECT 
    m.code,
    m.title,
    m.description,
    m.fee,
    m.time_threshold,
    m.flags,
    m.mutually_exclusive_with,
    m.reference_docs,
    m.created_at,
    m.updated_at,
    similarity(m.title, q) AS sim_title,
    similarity(m.description, q) AS sim_desc,
    GREATEST(similarity(m.title, q), similarity(m.description, q)) AS sim
  FROM mbs_items m
  WHERE 
    -- Match if ANY token appears in title or description
    EXISTS (
      SELECT 1
      FROM unnest(tokens) t
      WHERE t <> '' AND (m.title ILIKE '%' || t || '%' OR m.description ILIKE '%' || t || '%')
    )
  ORDER BY sim DESC
  LIMIT limit_n;
END;
$$ LANGUAGE plpgsql STABLE;

-- Expose as RPC for Supabase client
GRANT EXECUTE ON FUNCTION search_mbs_items(TEXT, INT) TO anon, authenticated;

-- Insert sample data
INSERT INTO mbs_items (code, title, description, fee, time_threshold, flags, mutually_exclusive_with, reference_docs) VALUES
('23', 'Professional attendance by a general practitioner', 'Professional attendance by a general practitioner at consulting rooms', 41.20, 20, '{"telehealth": true, "after_hours": false}', ARRAY['24', '25'], ARRAY['MBS Guidelines 2023', 'Clinical Notes']),
('24', 'Professional attendance by a general practitioner - after hours', 'Professional attendance by a general practitioner at consulting rooms after hours', 82.40, 40, '{"telehealth": false, "after_hours": true}', ARRAY['23', '25'], ARRAY['MBS Guidelines 2023', 'After Hours Guidelines']),
('25', 'Professional attendance by a general practitioner - weekend', 'Professional attendance by a general practitioner at consulting rooms on weekend', 123.60, 60, '{"telehealth": false, "after_hours": true, "weekend": true}', ARRAY['23', '24'], ARRAY['MBS Guidelines 2023', 'Weekend Guidelines'])
ON CONFLICT (code) DO NOTHING;

-- Create a view for easier querying
CREATE OR REPLACE VIEW mbs_items_view AS
SELECT 
    code,
    title,
    description,
    fee,
    time_threshold,
    flags,
    mutually_exclusive_with,
    reference_docs,
    created_at,
    updated_at
FROM mbs_items
ORDER BY code;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Enable extension
create extension if not exists pgcrypto;

-- =============================
-- Patient / Practitioner / Organization tables
-- =============================

CREATE TABLE IF NOT EXISTS mbs_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hpio TEXT,
  phone TEXT,
  address TEXT,
  fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mbs_practitioners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  specialty TEXT,
  hpii TEXT,
  provider_number TEXT,
  phone TEXT,
  organization_id uuid REFERENCES mbs_organizations(id) ON DELETE SET NULL,
  fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mbs_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male','female','other','unknown')),
  dob DATE,
  medicare_number TEXT,
  phone TEXT,
  address TEXT,
  managing_org_id uuid REFERENCES mbs_organizations(id) ON DELETE SET NULL,
  gp_id uuid REFERENCES mbs_practitioners(id) ON DELETE SET NULL,
  fhir JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);