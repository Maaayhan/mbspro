-- Extensions & Indexes Migration for Supabase (Day-2 S3)
-- Run in Supabase SQL Editor or via Supabase CLI

-- Enable required/optional extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent; -- optional

-- Trigram indexes for similarity search
CREATE INDEX IF NOT EXISTS trgm_mbs_items_title ON mbs_items USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_mbs_items_description ON mbs_items USING GIN (description gin_trgm_ops);

-- Full-text search index (optional but recommended)
-- Uses unaccent to improve matching across accents
CREATE OR REPLACE FUNCTION unaccent_english(text) RETURNS text AS $$
  SELECT unaccent('public.unaccent', $1)
$$ LANGUAGE SQL IMMUTABLE;

CREATE INDEX IF NOT EXISTS fts_mbs_items_all ON mbs_items USING GIN (
  to_tsvector('english', unaccent_english(coalesce(title,'') || ' ' || coalesce(description,'')))
);

-- Notes:
-- - Use EXPLAIN ANALYZE to verify index usage on similarity and FTS queries.
-- - Ensure RLS policies allow reads for your role when testing.
