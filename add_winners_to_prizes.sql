-- ── Migration: Add winner support to event_prizes ─────────────────────────
-- Adds columns to track who won which prize.

ALTER TABLE event_prizes
    ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN event_prizes.winner_id IS 'UUID of the winning student (for individual events).';
COMMENT ON COLUMN event_prizes.winner_team_id IS 'UUID of the winning team (for team events).';
