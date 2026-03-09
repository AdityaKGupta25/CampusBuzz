-- ── Migration: Registration Settings Columns for Events ──────────────────────────
-- These columns are required by the Faculty Event Management dashboard
-- and the Student Registration workspace for handling team events and data collection.

ALTER TABLE events ADD COLUMN IF NOT EXISTS collect_resume BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS collect_github BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS collect_linkedin BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_team_event BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS min_team_size INT DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_team_size INT DEFAULT 4;
