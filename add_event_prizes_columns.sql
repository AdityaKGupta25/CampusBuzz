-- ─── Fix: Add ALL missing columns to event_prizes (safe to re-run) ────────────
-- The table likely exists but was created without value/icon/goodie/position/reward.
-- Use ALTER TABLE ADD COLUMN IF NOT EXISTS — safe to run even if some already exist.

ALTER TABLE event_prizes
    ADD COLUMN IF NOT EXISTS value      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS icon       TEXT           NOT NULL DEFAULT 'trophy',
    ADD COLUMN IF NOT EXISTS goodie     TEXT,
    ADD COLUMN IF NOT EXISTS position   INTEGER        NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS reward     TEXT           NOT NULL DEFAULT '';

-- Verify all columns are present
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'event_prizes'
ORDER BY ordinal_position;
