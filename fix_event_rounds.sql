-- ─── Fix: event_rounds missing columns + broken trigger ───────────────────────
-- Run this in Supabase SQL Editor.

-- Step 1: Add all columns that may be missing (safe to re-run)
ALTER TABLE event_rounds
    ADD COLUMN IF NOT EXISTS description   TEXT,
    ADD COLUMN IF NOT EXISTS round_number  INTEGER        NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS type          TEXT           NOT NULL DEFAULT 'submission',
    ADD COLUMN IF NOT EXISTS start_time    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_time      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW();

-- Step 2: Drop and recreate the trigger (in case it was attached to an old version)
DROP TRIGGER IF EXISTS set_updated_at_event_rounds ON event_rounds;
CREATE TRIGGER set_updated_at_event_rounds
    BEFORE UPDATE ON event_rounds
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Step 3: Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_rounds'
ORDER BY ordinal_position;
