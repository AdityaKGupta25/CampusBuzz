-- ─── Migration: Add registration_config to events ────────────────────────────
-- Run this in your Supabase SQL editor.

ALTER TABLE events
ADD COLUMN IF NOT EXISTS registration_config JSONB DEFAULT '{
  "collect_resume": false,
  "collect_github": false,
  "collect_linkedin": false,
  "team_participation": false,
  "team_min_size": 1,
  "team_max_size": 4
}'::jsonb;

-- Backfill existing rows with the default config
UPDATE events
SET registration_config = '{
  "collect_resume": false,
  "collect_github": false,
  "collect_linkedin": false,
  "team_participation": false,
  "team_min_size": 1,
  "team_max_size": 4
}'::jsonb
WHERE registration_config IS NULL;
