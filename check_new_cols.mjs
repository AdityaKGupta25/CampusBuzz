import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://eeomuefujtyquhgpcmft.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio',
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// Test if columns already exist by trying to select them
const { data, error } = await supabase
    .from('institutions')
    .select('email_domain, campus_code')
    .limit(1)

if (!error) {
    console.log('✅ email_domain and campus_code columns already exist!')
} else {
    console.log('⚠️  Columns missing. Please run this SQL in Supabase Dashboard → SQL Editor:\n')
    console.log(`ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS email_domain  TEXT,
    ADD COLUMN IF NOT EXISTS campus_code   TEXT;`)
    console.log('\nURL: https://supabase.com/dashboard/project/eeomuefujtyquhgpcmft/sql/new')
}
