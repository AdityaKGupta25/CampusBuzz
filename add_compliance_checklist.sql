-- ── Migration: Add Compliance Checklist to Events ──────────────────────────
-- For Deep Governance Review in the HOD Dashboard.

ALTER TABLE events ADD COLUMN IF NOT EXISTS compliance_checklist JSONB DEFAULT '[
    {"id": "budget", "label": "Budget matches department cap", "checked": true},
    {"id": "venue", "label": "Venue availability verified", "checked": true},
    {"id": "safety", "label": "Security & Safety protocol attached", "checked": false},
    {"id": "sdg", "label": "SDG Alignment identified", "checked": false}
]'::jsonb;

-- Optional: Update enum to include changes_requested if not exists
-- (PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE, so we use a block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_status' AND e.enumlabel = 'changes_requested') THEN
        ALTER TYPE event_status ADD VALUE 'changes_requested';
    END IF;
END $$;
