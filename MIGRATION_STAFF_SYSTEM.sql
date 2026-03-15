-- Migration: Add Event Staff and Notifications infrastructure
-- Date: 2026-03-08

-- 1. Create table for event_staff
CREATE TABLE IF NOT EXISTS event_staff (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id    UUID        REFERENCES institutions(id) ON DELETE CASCADE, -- BREAK RECURSION: Direct tenant ID
    role_name         TEXT        NOT NULL DEFAULT 'Volunteer',
    grant_edit_access BOOLEAN     NOT NULL DEFAULT FALSE,
    assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicates
    CONSTRAINT uq_event_student_staff UNIQUE (event_id, student_id)
);

-- Ensure the columns exist (Safety for incremental migration)
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS role_name TEXT NOT NULL DEFAULT 'Volunteer';
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS grant_edit_access BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

-- Index for RLS performance
CREATE INDEX IF NOT EXISTS idx_event_staff_ids ON event_staff(event_id, student_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_institution_id ON event_staff(institution_id);

-- Enable RLS
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

-- 2. Create table for notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    type        TEXT        NOT NULL DEFAULT 'info', -- info, success, warning, alert
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    link        TEXT,       -- optional action link
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Ensure the link column exists (Safety for incremental migration)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- 3. Helpers
CREATE OR REPLACE FUNCTION current_user_institution()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT institution_id FROM users WHERE auth_uid = auth.uid() LIMIT 1;
$$;

-- 4. RLS Policies for event_staff (NON-RECURSIVE)
DROP POLICY IF EXISTS "event_staff_select" ON event_staff;
CREATE POLICY "event_staff_select"
    ON event_staff FOR SELECT
    USING (
        institution_id = current_user_institution()
    );

DROP POLICY IF EXISTS "event_staff_insert" ON event_staff;
CREATE POLICY "event_staff_insert"
    ON event_staff FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_staff.event_id 
            AND (e.creator_id = current_user_id() OR current_user_role() IN ('admin', 'hod'))
        )
    );

DROP POLICY IF EXISTS "event_staff_delete" ON event_staff;
CREATE POLICY "event_staff_delete"
    ON event_staff FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_staff.event_id 
            AND (e.creator_id = current_user_id() OR current_user_role() IN ('admin', 'hod'))
        )
    );

-- 5. RLS Policies for notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
    ON notifications FOR SELECT
    USING (user_id = current_user_id());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
    ON notifications FOR UPDATE
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- 5. Atomic logic to assign staff and notify (Security Definer)
CREATE OR REPLACE FUNCTION assign_event_staff(
    p_event_id UUID,
    p_student_id UUID,
    p_role TEXT,
    p_edit_access BOOLEAN,
    p_notif_title TEXT,
    p_notif_message TEXT
)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
    v_ins_id UUID;
BEGIN
    -- Resolve institution_id one time to store it in event_staff
    SELECT institution_id INTO v_ins_id FROM events WHERE id = p_event_id;

    -- 1. Insert/Update staff record
    INSERT INTO event_staff (event_id, student_id, role_name, grant_edit_access, institution_id)
    VALUES (p_event_id, p_student_id, p_role, p_edit_access, v_ins_id)
    ON CONFLICT (event_id, student_id) 
    DO UPDATE SET 
        role_name = EXCLUDED.role_name,
        grant_edit_access = EXCLUDED.grant_edit_access;

    -- 1b. Legacy column update (Safely attempting update if role column exists)
    BEGIN
        UPDATE event_staff SET role = p_role WHERE event_id = p_event_id AND student_id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        -- Column doesn't exist, ignore
    END;

    -- 2. Create notification
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        p_student_id, 
        p_notif_title, 
        p_notif_message, 
        'info', 
        '/faculty/event/' || p_event_id || '/manage'
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Update events policies to include staff
DO $$
BEGIN
    -- SELECT policy for all assigned staff
    DROP POLICY IF EXISTS "events_select_staff" ON events;
    CREATE POLICY "events_select_staff"
        ON events FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM event_staff es
                WHERE es.event_id = events.id 
                AND es.student_id = current_user_id()
            )
        );

    -- UPDATE policy for staff with explicitly granted edit access
    DROP POLICY IF EXISTS "events_update_staff" ON events;
    CREATE POLICY "events_update_staff"
        ON events FOR UPDATE
        USING (
            (creator_id = current_user_id() AND status = 'draft')
            OR current_user_role() IN ('admin', 'hod')
            OR EXISTS (
                SELECT 1 FROM event_staff es
                WHERE es.event_id = events.id 
                AND es.student_id = current_user_id() 
                AND es.grant_edit_access = TRUE
                AND events.status = 'draft'
            )
        );
END $$;
