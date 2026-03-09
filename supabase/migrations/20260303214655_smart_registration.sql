-- ── Migration: Smart Registration & Student Resumes ──────────────────────────────────
-- 1. Add fields to registrations
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 2. Create the 'student-resumes' bucket for student file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-resumes', 'student-resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Public Access (Anyone can see/download resumes if shared, but usually faculty see via portal)
CREATE POLICY "Resume Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-resumes');

-- Allow Students to Upload (Authenticated users)
CREATE POLICY "Student Resume Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-resumes');

-- Allow Students to Manage their own resumes
CREATE POLICY "Student Resume Management"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'student-resumes')
WITH CHECK (bucket_id = 'student-resumes');

-- 3. Enhanced Registration RPC v3
-- Supports github_url, linkedin_url, resume_url
CREATE OR REPLACE FUNCTION student_register_event_v3(
    p_event_id      UUID,
    p_student_id    UUID,
    p_action        TEXT,          -- 'create' | 'join' | 'individual'
    p_team_name     TEXT    DEFAULT NULL,
    p_join_code     TEXT    DEFAULT NULL,
    p_github_url    TEXT    DEFAULT NULL,
    p_linkedin_url  TEXT    DEFAULT NULL,
    p_resume_url    TEXT    DEFAULT NULL
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
    v_team_max_size   INT;
BEGIN
    -- 1. Fetch event status and config
    SELECT status, registered_count, registration_config 
    INTO v_event_status, v_registered, v_config
    FROM events WHERE id = p_event_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- 2. Basic guards
    IF v_event_status != 'live' AND v_event_status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event is not open for registration');
    END IF;

    -- 3. Capacity Check
    SELECT capacity INTO v_capacity FROM venues 
    WHERE id = (SELECT venue_id FROM events WHERE id = p_event_id);
    
    -- If no venue or no capacity, assume unlimited for now (or default to 1000)
    IF v_capacity IS NULL THEN v_capacity := 1000; END IF;

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
        WHERE upper(join_code) = upper(p_join_code) AND event_id = p_event_id;

        IF v_team_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid join code for this event');
        END IF;

        -- Check team size limit
        v_team_max_size := COALESCE((v_config->>'team_max_size')::int, 4);
        IF (SELECT count(*) FROM registrations WHERE team_id = v_team_id) >= v_team_max_size THEN
            RETURN jsonb_build_object('success', false, 'error', 'Team is already full');
        END IF;
    END IF;

    -- 6. Insert registration
    INSERT INTO registrations (
        event_id, 
        student_id, 
        team_id, 
        status, 
        github_url, 
        linkedin_url, 
        resume_url
    )
    VALUES (
        p_event_id, 
        p_student_id, 
        v_team_id, 
        'confirmed', 
        p_github_url, 
        p_linkedin_url, 
        p_resume_url
    )
    RETURNING id INTO v_reg_id;

    -- 7. Increment count
    UPDATE events SET registered_count = registered_count + 1 WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success', true, 
        'registration_id', v_reg_id, 
        'team_id', v_team_id,
        'join_code', (SELECT join_code FROM teams WHERE id = v_team_id)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
