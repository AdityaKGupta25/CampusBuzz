-- =============================================================================
-- CampusBuzz — College Event Governance Platform
-- PostgreSQL Schema (Production-Grade)
-- Author  : Senior Database Architect
-- Version : 1.0.0
-- Date    : 2026-02-24
-- =============================================================================
-- Run this entire file against your Supabase / PostgreSQL instance.
-- Order matters: extensions → types → tables → triggers → RLS
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()  (Supabase default)


-- ---------------------------------------------------------------------------
-- 1. CUSTOM ENUM TYPES
-- ---------------------------------------------------------------------------

-- User roles within the institution
CREATE TYPE user_role AS ENUM (
    'student',
    'faculty',
    'hod',
    'admin'
);

-- Full event lifecycle
CREATE TYPE event_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'live',
    'completed'
);

-- Risk classification for events
CREATE TYPE risk_level AS ENUM (
    'low',
    'medium',
    'high'
);

-- Approval decision at each governance stage
CREATE TYPE approval_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'escalated'
);

-- Registration outcome for a student
CREATE TYPE registration_status AS ENUM (
    'confirmed',
    'waitlisted',
    'cancelled',
    'attended'
);


-- ---------------------------------------------------------------------------
-- 2. SHARED TRIGGER FUNCTION — auto-update "updated_at"
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 3. TABLE: departments
--    Must be created before users (FK reference)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT        NOT NULL UNIQUE,
    budget_cap   NUMERIC(12, 2) NOT NULL DEFAULT 0.00
                             CHECK (budget_cap >= 0),
    budget_used  NUMERIC(12, 2) NOT NULL DEFAULT 0.00
                             CHECK (budget_used >= 0),

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  departments              IS 'Academic departments of the institution.';
COMMENT ON COLUMN departments.budget_cap  IS 'Maximum annual event budget allocated (INR).';
COMMENT ON COLUMN departments.budget_used IS 'Running total of approved-event budgets consumed.';

-- Trigger
CREATE TRIGGER set_updated_at_departments
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. TABLE: users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE
                                CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
    full_name       TEXT        NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
    role            user_role   NOT NULL DEFAULT 'student',
    department_id   UUID        REFERENCES departments(id) ON DELETE SET NULL,
    karma_points    INTEGER     NOT NULL DEFAULT 0 CHECK (karma_points >= 0),

    -- Supabase Auth: link to auth.users
    auth_uid        UUID        UNIQUE,   -- nullable for seed / service accounts

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users              IS 'Platform users — students, faculty, HoDs, and admins.';
COMMENT ON COLUMN users.auth_uid     IS 'Foreign key to Supabase auth.users.id.';
COMMENT ON COLUMN users.karma_points IS 'Gamification score earned by attending / organising events.';

CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_role          ON users(role);
CREATE INDEX idx_users_department_id ON users(department_id);

-- Trigger
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. TABLE: venues
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS venues (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    capacity    INTEGER     NOT NULL CHECK (capacity > 0),
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  venues           IS 'Physical / virtual spaces where events are held.';
COMMENT ON COLUMN venues.capacity  IS 'Maximum number of attendees the venue can host.';
COMMENT ON COLUMN venues.is_active IS 'Soft-delete flag; inactive venues cannot host new events.';

CREATE INDEX idx_venues_is_active ON venues(is_active);

-- Trigger
CREATE TRIGGER set_updated_at_venues
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 6. TABLE: events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT           NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
    description      TEXT,
    creator_id       UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    department_id    UUID           NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    status           event_status   NOT NULL DEFAULT 'draft',
    risk_level       risk_level     NOT NULL DEFAULT 'low',
    budget_required  NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (budget_required >= 0),
    start_time       TIMESTAMPTZ    NOT NULL,
    end_time         TIMESTAMPTZ    NOT NULL,
    venue_id         UUID           REFERENCES venues(id) ON DELETE SET NULL,

    -- Derived stats (updated by triggers / functions)
    registered_count INTEGER        NOT NULL DEFAULT 0 CHECK (registered_count >= 0),
    attended_count   INTEGER        NOT NULL DEFAULT 0 CHECK (attended_count >= 0),

    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- Business rule: end must be after start
    CONSTRAINT chk_event_time_order CHECK (end_time > start_time)
);

COMMENT ON TABLE  events                  IS 'Core event entity spanning the full governance lifecycle.';
COMMENT ON COLUMN events.risk_level       IS 'Risk classification determines how many approval stages are required.';
COMMENT ON COLUMN events.budget_required  IS 'Requested budget in INR; validated against department budget_cap.';
COMMENT ON COLUMN events.registered_count IS 'Denormalised count kept in sync by application-level triggers.';

CREATE INDEX idx_events_creator_id    ON events(creator_id);
CREATE INDEX idx_events_department_id ON events(department_id);
CREATE INDEX idx_events_status        ON events(status);
CREATE INDEX idx_events_venue_id      ON events(venue_id);
CREATE INDEX idx_events_start_time    ON events(start_time);

-- Trigger
CREATE TRIGGER set_updated_at_events
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 7. TABLE: approvals
--    Multi-stage governance trail (faculty → HoD → admin)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approvals (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID            NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    approver_id UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status      approval_status NOT NULL DEFAULT 'pending',
    comment     TEXT,
    -- stage identifies which level in the chain (1 = faculty, 2 = hod, 3 = admin)
    stage       SMALLINT        NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 5),
    timestamp   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- One active approval record per (event, approver, stage)
    CONSTRAINT uq_approval_event_approver_stage UNIQUE (event_id, approver_id, stage)
);

COMMENT ON TABLE  approvals         IS 'Immutable audit trail of every approval decision per governance stage.';
COMMENT ON COLUMN approvals.stage   IS '1 = Faculty, 2 = HoD, 3 = Admin / DSW.';
COMMENT ON COLUMN approvals.comment IS 'Mandatory rejection reason or optional approval note.';

CREATE INDEX idx_approvals_event_id    ON approvals(event_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX idx_approvals_status      ON approvals(status);

-- Trigger
CREATE TRIGGER set_updated_at_approvals
    BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 8. TABLE: registrations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS registrations (
    id             UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       UUID                NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id     UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status         registration_status NOT NULL DEFAULT 'confirmed',
    qr_code_token  TEXT                UNIQUE,   -- cryptographic token for QR scan

    created_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- A student can register for an event only once
    CONSTRAINT uq_registration_event_student UNIQUE (event_id, student_id)
);

COMMENT ON TABLE  registrations               IS 'Student registrations (and waitlist positions) for events.';
COMMENT ON COLUMN registrations.qr_code_token IS 'HMAC / JWT token encoded in the QR code for on-site check-in.';

CREATE INDEX idx_registrations_event_id   ON registrations(event_id);
CREATE INDEX idx_registrations_student_id ON registrations(student_id);
CREATE INDEX idx_registrations_status     ON registrations(status);

-- Trigger
CREATE TRIGGER set_updated_at_registrations
    BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 9. TABLE: attendance_logs
--    Written by the QR-scan / check-in device; append-only by design.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id   TEXT        NOT NULL,   -- identifier of the scanning device / app instance

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate scans for the same student at the same event
    CONSTRAINT uq_attendance_event_student UNIQUE (event_id, student_id)
);

COMMENT ON TABLE  attendance_logs           IS 'Hardware / app-generated QR scan events; serves as the source of truth for attendance.';
COMMENT ON COLUMN attendance_logs.device_id IS 'MAC address, app install ID, or scanner serial number.';

CREATE INDEX idx_attendance_event_id   ON attendance_logs(event_id);
CREATE INDEX idx_attendance_student_id ON attendance_logs(student_id);
CREATE INDEX idx_attendance_scan_time  ON attendance_logs(scan_time);

-- Trigger
CREATE TRIGGER set_updated_at_attendance_logs
    BEFORE UPDATE ON attendance_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ---------------------------------------------------------------------------
-- 10. TABLE: verified_ledger
--     Immutable blockchain-style certificate issuance log.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS verified_ledger (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id          UUID        NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    certificate_hash  TEXT        NOT NULL UNIQUE,  -- SHA-256 of cert payload
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One certificate per (student, event)
    CONSTRAINT uq_ledger_student_event UNIQUE (student_id, event_id)
);

COMMENT ON TABLE  verified_ledger                  IS 'Tamper-evident certificate issuance ledger; records are never deleted.';
COMMENT ON COLUMN verified_ledger.certificate_hash IS 'SHA-256 / keccak256 hash of the full certificate JSON payload.';

CREATE INDEX idx_ledger_student_id ON verified_ledger(student_id);
CREATE INDEX idx_ledger_event_id   ON verified_ledger(event_id);
CREATE INDEX idx_ledger_issued_at  ON verified_ledger(issued_at);

-- Trigger
CREATE TRIGGER set_updated_at_verified_ledger
    BEFORE UPDATE ON verified_ledger
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Strategy:
--   • Supabase Auth JWT carries  auth.uid()  →  mapped to users.auth_uid
--   • A helper function resolves the current user's platform role.
--   • All tables default-deny; explicit policies grant minimum required access.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Helper: get the current user's role from the users table
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM users WHERE auth_uid = auth.uid() LIMIT 1;
$$;

-- Helper: get the current user's internal UUID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT id FROM users WHERE auth_uid = auth.uid() LIMIT 1;
$$;

-- Helper: get department of the current user
CREATE OR REPLACE FUNCTION current_user_department()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT department_id FROM users WHERE auth_uid = auth.uid() LIMIT 1;
$$;


-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------

ALTER TABLE departments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_ledger ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- RLS POLICIES — departments
-- =============================================================================

-- All authenticated users can read departments
CREATE POLICY "departments_select_authenticated"
    ON departments FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins can insert / update / delete departments
CREATE POLICY "departments_insert_admin"
    ON departments FOR INSERT
    WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "departments_update_admin"
    ON departments FOR UPDATE
    USING (current_user_role() = 'admin');

CREATE POLICY "departments_delete_admin"
    ON departments FOR DELETE
    USING (current_user_role() = 'admin');


-- =============================================================================
-- RLS POLICIES — users
-- =============================================================================

-- Users can read their own record; admins see everyone
CREATE POLICY "users_select_own_or_admin"
    ON users FOR SELECT
    USING (
        auth_uid = auth.uid()
        OR current_user_role() = 'admin'
    );

-- Only admins can insert new users (normal sign-up happens via auth trigger)
CREATE POLICY "users_insert_admin"
    ON users FOR INSERT
    WITH CHECK (current_user_role() = 'admin');

-- Users can update their own profile; admins can update anyone
CREATE POLICY "users_update_own_or_admin"
    ON users FOR UPDATE
    USING (
        auth_uid = auth.uid()
        OR current_user_role() = 'admin'
    );

-- Only admins can delete users
CREATE POLICY "users_delete_admin"
    ON users FOR DELETE
    USING (current_user_role() = 'admin');


-- =============================================================================
-- RLS POLICIES — venues
-- =============================================================================

-- All authenticated users can view venues
CREATE POLICY "venues_select_authenticated"
    ON venues FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins manage venues
CREATE POLICY "venues_write_admin"
    ON venues FOR ALL
    USING (current_user_role() = 'admin')
    WITH CHECK (current_user_role() = 'admin');


-- =============================================================================
-- RLS POLICIES — events
-- =============================================================================

-- Students & faculty see LIVE / COMPLETED events in their department, plus their own drafts
CREATE POLICY "events_select_student_faculty"
    ON events FOR SELECT
    USING (
        -- Approved / live / completed events visible to everyone in the department
        (
            status IN ('approved', 'live', 'completed')
            AND department_id = current_user_department()
        )
        -- Creator always sees their own events regardless of status
        OR creator_id = current_user_id()
        -- Admins see everything
        OR current_user_role() = 'admin'
        -- HoDs see all events in their department
        OR (
            current_user_role() = 'hod'
            AND department_id = current_user_department()
        )
        -- Faculty see pending events they need to approve
        OR (
            current_user_role() = 'faculty'
            AND status IN ('pending', 'approved', 'rejected', 'live', 'completed')
            AND department_id = current_user_department()
        )
    );

-- Any authenticated user (faculty / student) can create an event (draft)
CREATE POLICY "events_insert_authenticated"
    ON events FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND creator_id = current_user_id()
    );

-- Only the creator (while draft) or admin can update an event
CREATE POLICY "events_update_creator_or_admin"
    ON events FOR UPDATE
    USING (
        (creator_id = current_user_id() AND status = 'draft')
        OR current_user_role() IN ('admin', 'hod')
    );

-- Only admins can hard-delete events
CREATE POLICY "events_delete_admin"
    ON events FOR DELETE
    USING (current_user_role() = 'admin');


-- =============================================================================
-- RLS POLICIES — approvals
-- =============================================================================

-- Approvers see their own approval tasks; creators see approvals for their events; admins see all
CREATE POLICY "approvals_select"
    ON approvals FOR SELECT
    USING (
        approver_id = current_user_id()
        OR current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM events
            WHERE events.id = approvals.event_id
              AND events.creator_id = current_user_id()
        )
    );

-- Approval records are created by the governance engine (admin / service role)
CREATE POLICY "approvals_insert_governance"
    ON approvals FOR INSERT
    WITH CHECK (
        current_user_role() IN ('admin', 'faculty', 'hod')
    );

-- Approvers can update their own pending record
CREATE POLICY "approvals_update_approver"
    ON approvals FOR UPDATE
    USING (
        approver_id = current_user_id()
        OR current_user_role() = 'admin'
    );

-- No deletes — approvals are immutable audit records
-- (enforce via application layer; no DELETE policy granted)


-- =============================================================================
-- RLS POLICIES — registrations
-- =============================================================================

-- Students see their own registrations; event creators and admins see all for that event
CREATE POLICY "registrations_select"
    ON registrations FOR SELECT
    USING (
        student_id = current_user_id()
        OR current_user_role() IN ('admin', 'faculty', 'hod')
        OR EXISTS (
            SELECT 1 FROM events
            WHERE events.id = registrations.event_id
              AND events.creator_id = current_user_id()
        )
    );

-- Students can register themselves
CREATE POLICY "registrations_insert_student"
    ON registrations FOR INSERT
    WITH CHECK (
        student_id = current_user_id()
        AND current_user_role() = 'student'
    );

-- Students can cancel their own registration
CREATE POLICY "registrations_update_student_or_admin"
    ON registrations FOR UPDATE
    USING (
        student_id = current_user_id()
        OR current_user_role() IN ('admin', 'faculty', 'hod')
    );

-- Students can soft-delete (cancel) their registration; admins can hard-delete
CREATE POLICY "registrations_delete"
    ON registrations FOR DELETE
    USING (
        student_id = current_user_id()
        OR current_user_role() = 'admin'
    );


-- =============================================================================
-- RLS POLICIES — attendance_logs
-- =============================================================================

-- Students see their own logs; organisers and admin see all logs for events they manage
CREATE POLICY "attendance_select"
    ON attendance_logs FOR SELECT
    USING (
        student_id = current_user_id()
        OR current_user_role() IN ('admin', 'faculty', 'hod')
    );

-- Only admin / faculty (scanner role) can insert attendance logs
CREATE POLICY "attendance_insert"
    ON attendance_logs FOR INSERT
    WITH CHECK (
        current_user_role() IN ('admin', 'faculty')
    );

-- Append-only — no updates or deletes allowed (enforced: no policy granted)


-- =============================================================================
-- RLS POLICIES — verified_ledger
-- =============================================================================

-- Students see their own certificates; admins see all; faculty see certificates for events they created
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

-- Only admin / service role can issue certificates (INSERT) or faculty for their own events
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

-- Create UPDATE policy (Upsert might implicitly require this even with ignoreDuplicates)
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

-- Ledger is immutable for students and hard deletes — no DELETE policies granted


-- =============================================================================
-- OPTIONAL: Supabase Auth hook — auto-create user profile on sign-up
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    final_full_name TEXT;
    final_role user_role;
BEGIN
    -- 1. Resolve full name with length safety (min 2, max 120 per schema)
    final_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    IF char_length(final_full_name) < 2 THEN final_full_name := final_full_name || ' _'; END IF;
    final_full_name := substring(final_full_name from 1 for 120);

    -- 2. Resolve role
    BEGIN
        final_role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
        final_role := 'student';
    END;

    -- 3. Upsert into public.users
    INSERT INTO public.users (
        auth_uid, 
        email, 
        full_name, 
        role, 
        institution_id, 
        department_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        final_full_name,
        final_role,
        (NULLIF(NEW.raw_user_meta_data->>'institution_id', ''))::UUID,
        (NULLIF(NEW.raw_user_meta_data->>'department_id', ''))::UUID
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_uid = EXCLUDED.auth_uid,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        institution_id = COALESCE(users.institution_id, EXCLUDED.institution_id),
        department_id = COALESCE(users.department_id, EXCLUDED.department_id);
    RETURN NEW;
END;
$$;

-- Wire the trigger to Supabase's auth schema
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
