-- ============================================================
-- CampusBuzz — Multi-Tenancy RLS Migration
-- Purpose: Enforce institution_id isolation at the DB level.
--          No query from any page can ever see another college's data.
-- Run in: Supabase Dashboard → SQL Editor
-- ⚠️  Run AFTER add_institution_id_migration.sql
-- ============================================================

-- ── STEP 1: Enable Row Level Security on all affected tables ──────────────────
ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;


-- ── STEP 2: Helper function — get the calling user's institution_id ────────────
-- This function reads from public.users where auth_uid = auth.uid().
-- It is SECURITY DEFINER so RLS on users doesn't block it.
CREATE OR REPLACE FUNCTION get_my_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT institution_id
    FROM   public.users
    WHERE  auth_uid = auth.uid()
    LIMIT  1;
$$;


-- ── STEP 3: RLS policies — EVENTS ────────────────────────────────────────────

-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "events_tenant_select"  ON events;
DROP POLICY IF EXISTS "events_tenant_insert"  ON events;
DROP POLICY IF EXISTS "events_tenant_update"  ON events;

-- SELECT: only events belonging to the user's institution
CREATE POLICY "events_tenant_select"
ON events FOR SELECT
USING (institution_id = get_my_institution_id());

-- INSERT: creator can only insert for their institution
CREATE POLICY "events_tenant_insert"
ON events FOR INSERT
WITH CHECK (institution_id = get_my_institution_id());

-- UPDATE: only same-institution events
CREATE POLICY "events_tenant_update"
ON events FOR UPDATE
USING     (institution_id = get_my_institution_id())
WITH CHECK (institution_id = get_my_institution_id());


-- ── STEP 4: RLS policies — USERS ─────────────────────────────────────────────

DROP POLICY IF EXISTS "users_tenant_select" ON users;
DROP POLICY IF EXISTS "users_own_row_update" ON users;

-- SELECT: see only users from own institution (+ own row always visible)
CREATE POLICY "users_tenant_select"
ON users FOR SELECT
USING (
    institution_id = get_my_institution_id()
    OR auth_uid = auth.uid()   -- always see your own row
);

-- UPDATE: users can only update their own row
CREATE POLICY "users_own_row_update"
ON users FOR UPDATE
USING (auth_uid = auth.uid())
WITH CHECK (auth_uid = auth.uid());


-- ── STEP 5: RLS policies — DEPARTMENTS ───────────────────────────────────────

DROP POLICY IF EXISTS "departments_tenant_select" ON departments;
DROP POLICY IF EXISTS "departments_tenant_insert"  ON departments;

CREATE POLICY "departments_tenant_select"
ON departments FOR SELECT
USING (institution_id = get_my_institution_id());

CREATE POLICY "departments_tenant_insert"
ON departments FOR INSERT
WITH CHECK (institution_id = get_my_institution_id());


-- ── STEP 6: RLS policies — REGISTRATIONS ──────────────────────────────────────
-- Registrations don't have institution_id directly,
-- but they belong to events which do.

DROP POLICY IF EXISTS "registrations_tenant_select" ON registrations;
DROP POLICY IF EXISTS "registrations_tenant_insert"  ON registrations;

CREATE POLICY "registrations_tenant_select"
ON registrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM events e
        WHERE  e.id = registrations.event_id
        AND    e.institution_id = get_my_institution_id()
    )
);

CREATE POLICY "registrations_tenant_insert"
ON registrations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events e
        WHERE  e.id = registrations.event_id
        AND    e.institution_id = get_my_institution_id()
    )
);


-- ── STEP 7: RLS policies — CLUBS ──────────────────────────────────────────────

DROP POLICY IF EXISTS "clubs_tenant_select" ON clubs;
DROP POLICY IF EXISTS "clubs_tenant_insert"  ON clubs;

-- NOTE: clubs table needs institution_id column first (add below if missing)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clubs_institution_id ON clubs(institution_id);

CREATE POLICY "clubs_tenant_select"
ON clubs FOR SELECT
USING (institution_id = get_my_institution_id());

CREATE POLICY "clubs_tenant_insert"
ON clubs FOR INSERT
WITH CHECK (institution_id = get_my_institution_id());


-- ── STEP 8: RLS policies — APPROVALS ─────────────────────────────────────────

DROP POLICY IF EXISTS "approvals_tenant_select" ON approvals;

CREATE POLICY "approvals_tenant_select"
ON approvals FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM events e
        WHERE  e.id = approvals.event_id
        AND    e.institution_id = get_my_institution_id()
    )
);


-- ── STEP 9: Service role bypass ───────────────────────────────────────────────
-- The service role (used by API routes and the bulk-onboard API)
-- bypasses RLS entirely — this is intentional and correct. No changes needed.


-- ── STEP 10: Notifications ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications_own_select" ON notifications;
DROP POLICY IF EXISTS "notifications_own_update"  ON notifications;

CREATE POLICY "notifications_own_select"
ON notifications FOR SELECT
USING (user_id = (SELECT id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1));

CREATE POLICY "notifications_own_update"
ON notifications FOR UPDATE
USING (user_id = (SELECT id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1));


-- ── VERIFICATION ──────────────────────────────────────────────────────────────
-- Run these to verify RLS is active on each table:
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('events','users','departments','registrations','clubs','approvals','verified_ledger','notifications')
ORDER BY tablename;
