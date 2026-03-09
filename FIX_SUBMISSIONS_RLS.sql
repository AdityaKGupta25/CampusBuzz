-- ── Fix Submissions RLS ──────────────────────────────────────────────────
-- This script fixes the RLS policies for submissions to support team events
-- and ensures that team members can see and update their team's submissions.

-- 1. Drop old restrictive policies
DROP POLICY IF EXISTS "submissions_select_student" ON submissions;
DROP POLICY IF EXISTS "submissions_insert_student" ON submissions;
DROP POLICY IF EXISTS "submissions_update_student" ON submissions;
DROP POLICY IF EXISTS "submissions_select_staff" ON submissions;
DROP POLICY IF EXISTS "submissions_update_staff" ON submissions;

-- 2. SELECT Policy: Students see their own OR their team's submissions
CREATE POLICY "submissions_select_student" ON submissions FOR SELECT
    TO authenticated
    USING (
        student_id = current_user_id()
        OR (
            team_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM registrations 
                WHERE team_id = submissions.team_id 
                AND student_id = current_user_id()
            )
        )
    );

-- 3. INSERT Policy: Students can insert if they are the student_id OR they are in the team
CREATE POLICY "submissions_insert_student" ON submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = current_user_id()
        OR (
            team_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM registrations
                WHERE team_id = submissions.team_id
                AND student_id = current_user_id()
            )
        )
    );

-- 4. UPDATE Policy: Students can update if they are the original submitter OR they are in the team
CREATE POLICY "submissions_update_student" ON submissions FOR UPDATE
    TO authenticated
    USING (
        (
            student_id = current_user_id()
            OR (
                team_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM registrations
                    WHERE team_id = submissions.team_id
                    AND student_id = current_user_id()
                )
            )
        )
        AND status = 'pending'
    )
    WITH CHECK (
        status = 'pending'
    );

-- 5. STAFF SELECT Policy: Re-implement staff select with proper department/event ownership check
CREATE POLICY "submissions_select_staff" ON submissions FOR SELECT
    TO authenticated
    USING (
        current_user_role() IN ('faculty', 'hod', 'admin')
        AND EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = submissions.event_id 
            AND (e.department_id = current_user_department() OR e.creator_id = current_user_id() OR current_user_role() = 'admin')
        )
    );

-- 6. STAFF UPDATE Policy: Staff (Faculty/HoD/Admin) can update submissions for grading
CREATE POLICY "submissions_update_staff" ON submissions FOR UPDATE
    TO authenticated
    USING (
        current_user_role() IN ('faculty', 'hod', 'admin')
        AND EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = submissions.event_id 
            AND (e.department_id = current_user_department() OR e.creator_id = current_user_id() OR current_user_role() = 'admin')
        )
    );
