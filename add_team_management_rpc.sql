-- ── Migration: Team Management RPC ──────────────────────────────────────────
-- Allows captains to remove members from their team.

CREATE OR REPLACE FUNCTION remove_team_member(
    p_team_id     UUID,
    p_student_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_leader_id UUID;
BEGIN
    -- 1. Check if the requester is the leader of the team
    SELECT leader_id INTO v_leader_id FROM teams WHERE id = p_team_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Team not found');
    END IF;

    IF v_leader_id != auth.uid() AND (SELECT auth_uid FROM users WHERE id = v_leader_id) != auth.uid() THEN
        -- We check both user.id and auth.uid mapping just in case
        -- Usually we compare against public.users.id
        IF (SELECT id FROM users WHERE auth_uid = auth.uid()) != v_leader_id THEN
             RETURN jsonb_build_object('success', false, 'error', 'Only the captain can remove members');
        END IF;
    END IF;

    -- 2. Cannnot remove the captain themselves from the team via this function
    -- (They should delete the team or transfer leadership if that was supported)
    IF v_leader_id = p_student_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Captain cannot be removed. You can delete the team instead.');
    END IF;

    -- 3. Check if member is actually in the team
    IF NOT EXISTS (SELECT 1 FROM registrations WHERE team_id = p_team_id AND student_id = p_student_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student is not a member of this team');
    END IF;

    -- 4. Remove from team (set team_id to NULL)
    UPDATE registrations 
    SET team_id = NULL 
    WHERE team_id = p_team_id AND student_id = p_student_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
