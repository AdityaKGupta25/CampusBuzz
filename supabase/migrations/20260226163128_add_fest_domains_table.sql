-- Create fest_domains table for umbrella events
CREATE TABLE IF NOT EXISTS fest_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    umbrella_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fest_domains_umbrella_event_id ON fest_domains(umbrella_event_id);

-- Enforce Domain Ownership (optional but good)
ALTER TABLE fest_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated for now" ON fest_domains
    FOR ALL USING (auth.role() = 'authenticated');
