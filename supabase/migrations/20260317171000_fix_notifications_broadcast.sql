-- Migration: Fix Notifications for Broadcast System
-- 1. Add missing column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_event_id ON notifications(related_event_id);

-- 3. Add INSERT policy for faculty/admin (to allow broadcasts)
DROP POLICY IF EXISTS "notifications_insert_faculty" ON notifications;
CREATE POLICY "notifications_insert_faculty"
    ON notifications FOR INSERT
    WITH CHECK (
        current_user_role() IN ('faculty', 'admin', 'hod')
    );

-- 4. Enable faculty/admin to see broadcast history for events they manage
DROP POLICY IF EXISTS "notifications_select_staff" ON notifications;
CREATE POLICY "notifications_select_staff"
    ON notifications FOR SELECT
    USING (
        user_id = current_user_id()
        OR current_user_role() IN ('admin', 'hod')
        OR EXISTS (
            SELECT 1 FROM event_staff es
            WHERE es.event_id = notifications.related_event_id
            AND es.student_id = current_user_id()
        )
        OR EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = notifications.related_event_id
            AND e.creator_id = current_user_id()
        )
    );
