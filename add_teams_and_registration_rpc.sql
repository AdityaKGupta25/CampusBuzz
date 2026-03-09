-- ── Migration: Teams Table & Registration RPC ──────────────────────────────────
-- This script adds team support and a robust registration function.

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    leader_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add team_id to registrations
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 3. Create RPC for registration
-- This function handles:
--   a. Capacity check
--   b. Duplicate check
--   c. Individual vs Team logic
--   d. Atomic count update
CREATE OR REPLACE FUNCTION student_register_event(
    p_event_id   UUID,
    p_student_id UUID,
    p_team_name  TEXT DEFAULT NULL
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
    v_is_team_event   BOOLEAN;
    v_team_min        INT;
    v_team_max        INT;
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

    -- Fetch capacity from venue
    SELECT capacity INTO v_capacity FROM venues 
    WHERE id = (SELECT venue_id FROM events WHERE id = p_event_id);
    
    IF v_registered >= v_capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event is sold out');
    END IF;

    -- 3. Check duplicate registration
    IF EXISTS (SELECT 1 FROM registrations WHERE event_id = p_event_id AND student_id = p_student_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already registered');
    END IF;

    -- 4. Team Logic
    v_is_team_event := (v_config->>'team_participation')::boolean;
    
    IF v_is_team_event THEN
        IF p_team_name IS NULL OR p_team_name = '' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Team name is required');
        END IF;

        -- Create team row
        INSERT INTO teams (event_id, name, leader_id)
        VALUES (p_event_id, p_team_name, p_student_id)
        RETURNING id INTO v_team_id;
    END IF;

    -- 5. Insert registration
    INSERT INTO registrations (event_id, student_id, team_id, status)
    VALUES (p_event_id, p_student_id, v_team_id, 'confirmed')
    RETURNING id INTO v_reg_id;

    -- 6. Increment count
    UPDATE events SET registered_count = registered_count + 1 WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true, 'registration_id', v_reg_id, 'team_id', v_team_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
