-- ── Migration: Enhance Teams with Join Codes & Members ──────────────────────────
-- Adds join_code to teams and creates a function to fetch team details.

-- 1. Add join_code to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE DEFAULT substring(upper(md5(random()::text)), 1, 6);

-- 2. Create team_members view or logic
-- Note: We already have registrations.team_id which acts as the member list.
-- We can create a view for easier fetching.
CREATE OR REPLACE VIEW team_details_view AS
SELECT 
    t.id as team_id,
    t.event_id,
    t.name as team_name,
    t.join_code,
    t.leader_id,
    jsonb_agg(jsonb_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'email', u.email
    )) as members
FROM teams t
JOIN registrations r ON r.team_id = t.id
JOIN users u ON r.student_id = u.id
GROUP BY t.id, t.event_id, t.name, t.join_code, t.leader_id;

-- 3. Enhanced Registration RPC
-- Handles CREATE and JOIN actions
CREATE OR REPLACE FUNCTION student_register_event_v2(
    p_event_id   UUID,
    p_student_id UUID,
    p_action     TEXT, -- 'create' | 'join' | 'individual'
    p_team_name  TEXT DEFAULT NULL,
    p_join_code  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_status    event_status;
    v_capacity        INT;
    v_registered      INT;
    v_team_id         UUID;
    v_reg_id          UUID;
    v_config          JSONB;
BEGIN
    -- 1. Fetch event status and config
    SELECT status, registered_count, registration_config 
    INTO v_event_status, v_registered, v_config
    FROM events WHERE id = p_event_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- 2. Basic guards
    IF v_event_status != 'live' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event is not live');
    END IF;

    -- 3. Capacity Check
    SELECT capacity INTO v_capacity FROM venues 
    WHERE id = (SELECT venue_id FROM events WHERE id = p_event_id);
    
    IF v_registered >= v_capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event is sold out');
    END IF;

    -- 4. Check duplicate registration
    IF EXISTS (SELECT 1 FROM registrations WHERE event_id = p_event_id AND student_id = p_student_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already registered for this event');
    END IF;

    -- 5. Team Logic
    IF p_action = 'create' THEN
        IF p_team_name IS NULL OR p_team_name = '' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Team name is required');
        END IF;

        INSERT INTO teams (event_id, name, leader_id)
        VALUES (p_event_id, p_team_name, p_student_id)
        RETURNING id INTO v_team_id;

    ELSIF p_action = 'join' THEN
        IF p_join_code IS NULL OR p_join_code = '' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Join code is required');
        END IF;

        SELECT id INTO v_team_id FROM teams 
        WHERE join_code = upper(p_join_code) AND event_id = p_event_id;

        IF v_team_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid join code for this event');
        END IF;

        -- Optional: Check team size limit
        IF (SELECT count(*) FROM registrations WHERE team_id = v_team_id) >= (v_config->>'team_max_size')::int THEN
            RETURN jsonb_build_object('success', false, 'error', 'Team is full');
        END IF;
    END IF;

    -- 6. Insert registration
    INSERT INTO registrations (event_id, student_id, team_id, status)
    VALUES (p_event_id, p_student_id, v_team_id, 'confirmed')
    RETURNING id INTO v_reg_id;

    -- 7. Increment count
    UPDATE events SET registered_count = registered_count + 1 WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true, 'registration_id', v_reg_id, 'team_id', v_team_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
