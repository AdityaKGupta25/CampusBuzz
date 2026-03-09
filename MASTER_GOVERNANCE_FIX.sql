-- ── Master Migration: Infrastructure for HOD Governance History ──
-- PURPOSE: Fixes missing columns and types for the updated HOD Dashboard.

-- 1. Add missing feedback columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS governance_note TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS archive_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS archive_request_note TEXT;

-- 2. Expand event_status ENUM
-- Note: 'archived' might be redundant if we use 'completed' + is_archived, 
-- but we've added it to the code types, so let's support it in DB for consistency.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_status' AND e.enumlabel = 'revision_required') THEN
        ALTER TYPE event_status ADD VALUE 'revision_required';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_status' AND e.enumlabel = 'changes_requested') THEN
        ALTER TYPE event_status ADD VALUE 'changes_requested';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'event_status' AND e.enumlabel = 'archived') THEN
        ALTER TYPE event_status ADD VALUE 'archived';
    END IF;
END $$;

-- 3. Update the HOD Governance RPC (Security Definer)
DROP FUNCTION IF EXISTS hod_update_event_status(UUID, event_status, TEXT);
DROP FUNCTION IF EXISTS hod_update_event_status(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION hod_update_event_status(
    p_event_id UUID,
    p_status TEXT, -- Take text to avoid enum casting issues during calls
    p_comment TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_updated_id UUID;
    v_cast_status event_status;
BEGIN
    -- Cast input text to our enum
    v_cast_status := p_status::event_status;

    UPDATE events
    SET 
        status = v_cast_status,
        governance_note = CASE 
            WHEN p_status IN ('changes_requested', 'revision_required') THEN p_comment 
            ELSE governance_note 
        END,
        rejection_reason = CASE 
            WHEN p_status = 'rejected' THEN p_comment 
            ELSE rejection_reason 
        END,
        updated_at = NOW()
    WHERE id = p_event_id
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'Event not found or permission denied.';
    END IF;

    RETURN json_build_object('id', v_updated_id, 'status', p_status);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION hod_update_event_status IS 'Atomic status update with feedback logging, bypassing RLS via Security Definer.';
