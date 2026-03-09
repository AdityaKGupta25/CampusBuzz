-- ── Migration: Add Archival Support to Events ──────────────────────────────────
-- This script adds governance features for completed events.

-- 1. Add is_archived column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create index for performance (archived events are usually filtered out)
CREATE INDEX IF NOT EXISTS idx_events_is_archived ON events(is_archived);

-- 3. Update existing policies or rely on application level filtering
-- Most views should now filter for is_archived = false

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'is_archived';
