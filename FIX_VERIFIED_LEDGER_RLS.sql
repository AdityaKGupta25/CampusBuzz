-- Drop previously created policies (including the initial ones and our first patch)
DROP POLICY IF EXISTS "ledger_select" ON verified_ledger;
DROP POLICY IF EXISTS "ledger_insert_admin" ON verified_ledger;
DROP POLICY IF EXISTS "ledger_insert_faculty_admin" ON verified_ledger;
DROP POLICY IF EXISTS "ledger_update_faculty" ON verified_ledger;

-- 1. Recreate SELECT policy: Students see their own; Admins see all; Faculty see certificates for events they created
CREATE POLICY "ledger_select"
    ON verified_ledger FOR SELECT
    USING (
        student_id = current_user_id()
        OR current_user_role() = 'admin'
        OR (
            current_user_role() IN ('faculty', 'hod')
            AND EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = verified_ledger.event_id 
                AND e.creator_id = current_user_id()
            )
        )
    );

-- 2. Create INSERT policy: Admin can insert anything; Faculty can insert only for events they own
CREATE POLICY "ledger_insert_faculty_admin"
    ON verified_ledger FOR INSERT
    WITH CHECK (
        current_user_role() = 'admin' 
        OR (
            current_user_role() IN ('faculty', 'hod')
            AND EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = verified_ledger.event_id 
                AND e.creator_id = current_user_id()
            )
        )
    );

-- 3. Create permissive UPDATE policy (Upsert might implicitly require this even with ignoreDuplicates)
CREATE POLICY "ledger_update_faculty"
    ON verified_ledger FOR UPDATE
    USING (
        current_user_role() = 'admin'
        OR (
            current_user_role() IN ('faculty', 'hod')
            AND EXISTS (
                SELECT 1 FROM events e
                WHERE e.id = verified_ledger.event_id
                AND e.creator_id = current_user_id()
            )
        )
    );
