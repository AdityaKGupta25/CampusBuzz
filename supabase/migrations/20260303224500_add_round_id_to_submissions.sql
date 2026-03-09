-- ── Migration: Add Round ID to Submissions ──────────────────────────────────
-- Allows multiple submissions per event (one per round)

-- 1. Add round_id column
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES event_rounds(id) ON DELETE CASCADE;

-- 2. Update uniqueness constraint
-- First drop the old one if it exists
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS uq_submission_event_student;

-- Create new one: (round_id, student_id) OR (round_id, team_id)
-- Note: We still want (event_id, student_id) for legacy but since we want per-round, 
-- let's make it (round_id, student_id) unique. If round_id is NULL, it falls back to event-wide.
-- But usually, we want it to be unique per round.
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS uq_submission_round_student;
ALTER TABLE submissions ADD CONSTRAINT uq_submission_round_student UNIQUE (round_id, student_id);

-- 3. If it's a team event, we might want unique per round per team
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS uq_submission_round_team;
-- This is trickier if team_id can be null, so we use (round_id, team_id) where team_id IS NOT NULL
-- For simplicity, let's keep it (round_id, student_id) for now, 
-- or (round_id, COALESCE(team_id, student_id)) but PG doesn't support that directly in unique constraint easily without index.

-- Correct way for conditional unique:
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_submission_round_team ON submissions (round_id, team_id) WHERE team_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_submission_round_student ON submissions (round_id, student_id) WHERE team_id IS NULL;
