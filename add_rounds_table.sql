
-- 11. TABLE: event_rounds
CREATE TABLE IF NOT EXISTS event_rounds (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title         TEXT        NOT NULL,
    description   TEXT,
    round_number  INTEGER     NOT NULL,
    type          TEXT        NOT NULL DEFAULT 'submission', -- submission, quiz, presentation, etc.
    start_time    TIMESTAMPTZ NOT NULL,
    end_time      TIMESTAMPTZ NOT NULL,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_round_time_order CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE event_rounds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "event_rounds_select_authenticated"
    ON event_rounds FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "event_rounds_manage_creator"
    ON event_rounds FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_rounds.event_id
              AND (events.creator_id = current_user_id() OR current_user_role() = 'admin')
        )
    );

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_event_rounds
    BEFORE UPDATE ON event_rounds
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Add banner_url if not exists (already in DbEvent interface but lets be sure)
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rich_description TEXT;
