-- =============================================================================
-- CampusBuzz — Institutions Table (Multi-Tenant Foundation)
-- Run this in Supabase SQL Editor → New Query
-- =============================================================================

CREATE TABLE IF NOT EXISTS institutions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 3 AND 200),
    subdomain       TEXT        NOT NULL UNIQUE
                                CHECK (subdomain ~* '^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$'),
    admin_email     TEXT        NOT NULL CHECK (admin_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
    logo_url        TEXT,
    plan            TEXT        NOT NULL DEFAULT 'starter',   -- starter | pro | enterprise
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    welcome_sent    BOOLEAN     NOT NULL DEFAULT FALSE,
    onboarded_at    TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  institutions              IS 'Top-level tenant registry for every onboarded college/institution.';
COMMENT ON COLUMN institutions.subdomain    IS 'Unique URL slug, e.g. "mit" → mit.campusbuzz.app';
COMMENT ON COLUMN institutions.admin_email  IS 'The root admin email for this institution.';
COMMENT ON COLUMN institutions.welcome_sent IS 'Whether the welcome/invite email has been dispatched.';

CREATE TRIGGER set_updated_at_institutions
    BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS: only service-role can touch this table (Founder Console uses service key)
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- No public policies — all access goes through service-role API routes
