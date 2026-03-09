
-- 1. CREATE event_prizes table for structured merit tracking
CREATE TABLE IF NOT EXISTS event_prizes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL, -- e.g. "Grand Champion", "1st Runner Up"
    value       NUMERIC(12, 2) DEFAULT 0,
    goodie      TEXT,      -- e.g. "MacBook Pro", "Merit Certificate"
    icon        TEXT        NOT NULL DEFAULT 'trophy', -- trophy, medal, award
    position    INTEGER     DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ENABLE RLS
ALTER TABLE event_prizes ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES
DROP POLICY IF EXISTS "prizes_select_auth" ON event_prizes;
CREATE POLICY "prizes_select_auth" ON event_prizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "prizes_manage_creator" ON event_prizes;
CREATE POLICY "prizes_manage_creator" ON event_prizes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_prizes.event_id 
        AND (events.creator_id = current_user_id() OR current_user_role() = 'admin')
    )
);
