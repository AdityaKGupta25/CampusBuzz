-- ── Migration: Add requires_submission to event_rounds ────────────────────────
-- Stores whether a round requires students to submit files/links.
-- Defaults to false. Faculty can override via the Add Round modal.

ALTER TABLE event_rounds
    ADD COLUMN IF NOT EXISTS requires_submission BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing digital_submission rounds to have it as true
UPDATE event_rounds
    SET requires_submission = TRUE
    WHERE type = 'digital_submission';

COMMENT ON COLUMN event_rounds.requires_submission IS
    'If true, a Submit button is shown to registered students during the round''s active window.';
