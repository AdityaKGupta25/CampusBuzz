import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://eeomuefujtyquhgpcmft.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio'
)

// Run the institutions DDL via RPC (Supabase supports raw SQL via service key)
const sql = `
CREATE TABLE IF NOT EXISTS institutions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 3 AND 200),
    subdomain       TEXT        NOT NULL UNIQUE
                                CHECK (subdomain ~* '^[a-z0-9][a-z0-9\\-]{1,48}[a-z0-9]$'),
    admin_email     TEXT        NOT NULL CHECK (admin_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'),
    logo_url        TEXT,
    plan            TEXT        NOT NULL DEFAULT 'starter',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    welcome_sent    BOOLEAN     NOT NULL DEFAULT FALSE,
    onboarded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
`

const { error } = await supabase.rpc('exec_sql', { query: sql }).single()

if (error) {
    // exec_sql may not exist — try direct insert to test table existence
    console.log('RPC not available, testing table directly...')
    const { error: testErr } = await supabase.from('institutions').select('id').limit(1)
    if (testErr && testErr.code === '42P01') {
        console.error('\n❌ Table "institutions" does not exist yet.')
        console.error('   → Please run create_institutions_table.sql manually in:')
        console.error('   → Supabase Dashboard → SQL Editor → New Query\n')
    } else if (!testErr) {
        console.log('✅ Table "institutions" already exists! Ready to go.')
    } else {
        console.error('Unknown error:', testErr)
    }
} else {
    console.log('✅ institutions table created successfully!')
}
