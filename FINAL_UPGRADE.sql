-- FINAL UPGRADE: Universal Mechanics, Category Tracks, and Experience Mode

-- 1. Universal Rounds Mechanics

-- 1.1 FORCE UNLOCK: Drop any old constraints
ALTER TABLE event_rounds DROP CONSTRAINT IF EXISTS event_rounds_type_check;
ALTER TABLE event_rounds DROP CONSTRAINT IF EXISTS chk_round_type;

-- 1.2 DATA MIGRATION: Convert old types to new identifiers
UPDATE event_rounds SET type = 'digital_submission' WHERE type = 'submission';
UPDATE event_rounds SET type = 'live_in_person' WHERE type = 'in_person';

-- 1.3 SYNC REMAINING: Ensure any outliers are marked as 'other'
UPDATE event_rounds SET type = 'other' 
WHERE type NOT IN ('online_test', 'digital_submission', 'live_in_person', 'virtual_meet');

-- 1.4 APPLY NEW CONSTRAINT
ALTER TABLE event_rounds ADD CONSTRAINT event_rounds_type_check 
CHECK (type IN ('online_test', 'digital_submission', 'live_in_person', 'virtual_meet', 'other'));

-- 2. Experience vs Competition Mode
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_competition BOOLEAN DEFAULT true;

-- 3. Participation Tracks & Governance
ALTER TABLE events ADD COLUMN IF NOT EXISTS participation_tracks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rulebook_url TEXT;

-- 4. Registration Track Linking
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS track_id UUID;

-- 5. Updated Registration Logic (RPC)
CREATE OR REPLACE FUNCTION student_register_event(
    p_event_id UUID,
    p_student_id UUID,
    p_track_id UUID DEFAULT NULL,
    p_team_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_event_status TEXT;
    v_reg_id UUID;
    v_existing_id UUID;
BEGIN
    -- Check if already registered
    SELECT id INTO v_existing_id FROM registrations 
    WHERE event_id = p_event_id AND student_id = p_student_id;
    
    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already registered for this event.');
    END IF;

    -- Fetch status
    SELECT status INTO v_event_status FROM events WHERE id = p_event_id;

    IF v_event_status NOT IN ('live', 'approved') THEN
        RETURN jsonb_build_object('success', false, 'error', 'This event is not open for registration.');
    END IF;

    -- Create Registration Record
    INSERT INTO registrations (event_id, student_id, track_id, status)
    VALUES (p_event_id, p_student_id, p_track_id, 'confirmed')
    RETURNING id INTO v_reg_id;

    -- Update Counter
    UPDATE events SET registered_count = COALESCE(registered_count, 0) + 1 WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true, 'registration_id', v_reg_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
