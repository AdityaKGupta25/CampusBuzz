-- ─── FIX: ALLOW FACULTY TO MANAGE THEIR FEST DOMAINS & EVENTS ───
-- Run this in your Supabase SQL Editor to grant full management rights to Faculty.

-- 1. FIX: EVENTS DELETION (Sub-events)
DROP POLICY IF EXISTS "events_delete_creator_or_admin" ON events;
CREATE POLICY "events_delete_creator_or_admin"
    ON events 
    FOR DELETE
    USING (
        (SELECT current_user_role()) = 'admin' 
        OR (creator_id = (SELECT id FROM users WHERE auth_uid = auth.uid()) AND status = 'draft')
        OR EXISTS (
            SELECT 1 FROM events AS parent 
            WHERE parent.id = events.parent_event_id 
            AND parent.creator_id = (SELECT id FROM users WHERE auth_uid = auth.uid())
        )
    );

-- 2. FIX: FEST_DOMAINS (Edit & Delete)
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "fest_domains_manage_creator" ON fest_domains;
DROP POLICY IF EXISTS "fest_domains_update_policy" ON fest_domains;
DROP POLICY IF EXISTS "fest_domains_delete_policy" ON fest_domains;

-- Allow Update for the faculty who owns the umbrella fest
CREATE POLICY "fest_domains_update_faculty" ON fest_domains
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = fest_domains.umbrella_event_id 
            AND e.creator_id = (SELECT id FROM users WHERE auth_uid = auth.uid())
        )
    );

-- Allow Delete for the faculty who owns the umbrella fest
CREATE POLICY "fest_domains_delete_faculty" ON fest_domains
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = fest_domains.umbrella_event_id 
            AND e.creator_id = (SELECT id FROM users WHERE auth_uid = auth.uid())
        )
    );

-- 3. FIX: SUBMISSIONS (Allows clearing data when deleting events)
DROP POLICY IF EXISTS "submissions_delete_staff" ON submissions;
CREATE POLICY "submissions_delete_staff" ON submissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = submissions.event_id 
            AND e.creator_id = (SELECT id FROM users WHERE auth_uid = auth.uid())
        )
    );

-- 4. VERIFY POLICIES
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'fest_domains', 'submissions');
