-- ── Migration: Add HOD Feedback Columns to Events ──────────────────────────
-- These columns store rejection reasons or revision notes from the HOD.

ALTER TABLE events ADD COLUMN IF NOT EXISTS governance_note TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Index for status filtering since faculty will now filter for revision_required
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Optional: If status enum doesn't have 'revision_required', add it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_status' AND e.enumlabel = 'revision_required') THEN
        ALTER TYPE event_status ADD VALUE 'revision_required';
    END IF;
END $$;

-- ── RPC: Update Event Status with Feedback ──────────────────────────
CREATE OR REPLACE FUNCTION hod_update_event_status(
    p_event_id UUID,
    p_status event_status,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_updated_id UUID;
BEGIN
    UPDATE events
    SET 
        status = p_status,
        governance_note = CASE WHEN p_status IN ('changes_requested', 'revision_required') THEN p_comment ELSE governance_note END,
        rejection_reason = CASE WHEN p_status = 'rejected' THEN p_comment ELSE rejection_reason END,
        updated_at = NOW()
    WHERE id = p_event_id
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'Event not found or permission denied.';
    END IF;

    RETURN json_build_object('id', v_updated_id, 'status', p_status);
END;
$$ LANGUAGE plpgsql;
