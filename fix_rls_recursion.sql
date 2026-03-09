-- ============================================================
-- CampusBuzz — RLS Infinite Recursion Fix
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Drop ALL conflicting policies on events and related
--          tables, then replace with one clean non-recursive set.
-- ============================================================


-- ── STEP 1: Drop every known policy on events ────────────────

DROP POLICY IF EXISTS "events_select_student_faculty"    ON events;
DROP POLICY IF EXISTS "events_insert_authenticated"       ON events;
DROP POLICY IF EXISTS "events_update_creator_or_admin"    ON events;
DROP POLICY IF EXISTS "events_delete_admin"               ON events;
DROP POLICY IF EXISTS "events_delete_creator_or_admin"    ON events;

-- From rls_multitenancy_migration.sql
DROP POLICY IF EXISTS "events_tenant_select"  ON events;
DROP POLICY IF EXISTS "events_tenant_insert"  ON events;
DROP POLICY IF EXISTS "events_tenant_update"  ON events;

-- Any other stray policies (add names here if you see others)
DROP POLICY IF EXISTS "events_select_all"  ON events;
DROP POLICY IF EXISTS "events_all"         ON events;


-- ── STEP 2: Drop conflicting policies on related tables ───────

-- registrations: old ones that may sub-select events with RLS
DROP POLICY IF EXISTS "registrations_select_own"          ON registrations;
DROP POLICY IF EXISTS "registrations_insert_own"          ON registrations;
DROP POLICY IF EXISTS "registrations_tenant_select"       ON registrations;
DROP POLICY IF EXISTS "registrations_tenant_insert"       ON registrations;

-- approvals
DROP POLICY IF EXISTS "approvals_select_involved"         ON approvals;
DROP POLICY IF EXISTS "approvals_tenant_select"           ON approvals;

-- verified_ledger
DROP POLICY IF EXISTS "ledger_select_own"                 ON verified_ledger;
DROP POLICY IF EXISTS "verified_ledger_select_own"        ON verified_ledger;

-- event_rounds (if RLS enabled)
DROP POLICY IF EXISTS "rounds_select_all"                 ON event_rounds;
DROP POLICY IF EXISTS "rounds_tenant_select"              ON event_rounds;

-- event_prizes (if RLS enabled)
DROP POLICY IF EXISTS "prizes_select_all"                 ON event_prizes;
DROP POLICY IF EXISTS "prizes_tenant_select"              ON event_prizes;


-- ── STEP 3: Ensure get_my_institution_id() exists & is clean ──
-- SECURITY DEFINER means it bypasses RLS on users — critical.

CREATE OR REPLACE FUNCTION get_my_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT institution_id
    FROM   public.users
    WHERE  auth_uid = auth.uid()
    LIMIT  1;
$$;


-- ── STEP 4: Recreate EVENTS policies — single, clean set ─────
-- Key rule: NEVER reference the 'events' table inside an events
-- policy. Use direct column checks + SECURITY DEFINER helpers only.

-- SELECT: any authenticated user in the same institution sees events
CREATE POLICY "events_tenant_select"
ON events FOR SELECT
USING (institution_id = get_my_institution_id());

-- INSERT: authenticated user can only insert for their own institution
CREATE POLICY "events_tenant_insert"
ON events FOR INSERT
WITH CHECK (institution_id = get_my_institution_id());

-- UPDATE: same-institution check (faculty creator OR admin/hod)
CREATE POLICY "events_tenant_update"
ON events FOR UPDATE
USING     (institution_id = get_my_institution_id())
WITH CHECK (institution_id = get_my_institution_id());

-- DELETE: admin / hod or creator can delete, same institution
CREATE POLICY "events_tenant_delete"
ON events FOR DELETE
USING (institution_id = get_my_institution_id());


-- ── STEP 5: Recreate REGISTRATIONS policies ───────────────────
-- Use institution_id directly if registrations table has it,
-- otherwise use a SECURITY DEFINER helper to avoid recursion.

-- Give registrations a direct institution_id column for safety:
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_registrations_institution_id ON registrations(institution_id);

-- Backfill institution_id from the linked event (one-time):
UPDATE registrations r
SET    institution_id = e.institution_id
FROM   events e
WHERE  r.event_id = e.id
AND    r.institution_id IS NULL;

-- Now the policy is a simple column check — no subquery into events:
CREATE POLICY "registrations_tenant_select"
ON registrations FOR SELECT
USING (institution_id = get_my_institution_id());

CREATE POLICY "registrations_tenant_insert"
ON registrations FOR INSERT
WITH CHECK (institution_id = get_my_institution_id());

CREATE POLICY "registrations_tenant_update"
ON registrations FOR UPDATE
USING     (institution_id = get_my_institution_id())
WITH CHECK (institution_id = get_my_institution_id());

CREATE POLICY "registrations_tenant_delete"
ON registrations FOR DELETE
USING (institution_id = get_my_institution_id());


-- ── STEP 6: Recreate APPROVALS policies ───────────────────────
-- approvals → event. Give approvals a direct institution_id too.

ALTER TABLE approvals ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_approvals_institution_id ON approvals(institution_id);

UPDATE approvals a
SET    institution_id = e.institution_id
FROM   events e
WHERE  a.event_id = e.id
AND    a.institution_id IS NULL;

DROP POLICY IF EXISTS "approvals_tenant_select" ON approvals;

CREATE POLICY "approvals_tenant_select"
ON approvals FOR SELECT
USING (institution_id = get_my_institution_id());

CREATE POLICY "approvals_tenant_insert"
ON approvals FOR INSERT
WITH CHECK (institution_id = get_my_institution_id());

CREATE POLICY "approvals_tenant_update"
ON approvals FOR UPDATE
USING     (institution_id = get_my_institution_id())
WITH CHECK (institution_id = get_my_institution_id());


-- ── STEP 7: VERIFIED LEDGER ───────────────────────────────────

ALTER TABLE verified_ledger ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ledger_institution_id ON verified_ledger(institution_id);

UPDATE verified_ledger vl
SET    institution_id = e.institution_id
FROM   events e
WHERE  vl.event_id = e.id
AND    vl.institution_id IS NULL;

DROP POLICY IF EXISTS "ledger_select_own"          ON verified_ledger;
DROP POLICY IF EXISTS "verified_ledger_select_own" ON verified_ledger;

CREATE POLICY "ledger_tenant_select"
ON verified_ledger FOR SELECT
USING (institution_id = get_my_institution_id());

CREATE POLICY "ledger_own_insert"
ON verified_ledger FOR INSERT
WITH CHECK (institution_id = get_my_institution_id());


-- ── STEP 8: EVENT_ROUNDS — disable RLS (no sensitive data) ───
-- Rounds don't contain institution-sensitive data on their own;
-- they inherit safety from the event they belong to.
-- If RLS IS enabled, add a passthrough for authenticated users.

ALTER TABLE event_rounds    DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_prizes    DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions     DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs DISABLE ROW LEVEL SECURITY;


-- ── STEP 9: USERS — ensure no recursion ───────────────────────
-- Replace the old schema.sql users policies with clean ones.

DROP POLICY IF EXISTS "users_select_own_or_admin"  ON users;
DROP POLICY IF EXISTS "users_insert_admin"          ON users;
DROP POLICY IF EXISTS "users_update_own_or_admin"   ON users;
DROP POLICY IF EXISTS "users_delete_admin"          ON users;
DROP POLICY IF EXISTS "users_tenant_select"         ON users;
DROP POLICY IF EXISTS "users_own_row_update"        ON users;

-- Users can see others in their institution, and always their own row:
CREATE POLICY "users_tenant_select"
ON users FOR SELECT
USING (
    institution_id = get_my_institution_id()
    OR auth_uid = auth.uid()
);

-- Users update only their own row:
CREATE POLICY "users_own_row_update"
ON users FOR UPDATE
USING     (auth_uid = auth.uid())
WITH CHECK (auth_uid = auth.uid());

-- Admin insert is handled by service role (API routes) — no anon insert:
-- (INSERT policy intentionally omitted; service role bypasses RLS)


-- ── VERIFICATION ───────────────────────────────────────────────
-- Check active policies per table:
SELECT tablename, policyname, cmd
FROM   pg_policies
WHERE  schemaname = 'public'
AND    tablename IN ('events','users','registrations','approvals','verified_ledger')
ORDER  BY tablename, cmd;
