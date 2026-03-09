import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://eeomuefujtyquhgpcmft.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio'
)

// 1. Fix role: admin@test.com → role='admin'
const { data: updated, error: updateErr } = await supabase
    .from('users')
    .update({ role: 'admin', full_name: 'Super Admin' })
    .eq('email', 'admin@test.com')
    .select('email, role, full_name')

if (updateErr) {
    console.error('❌ Update failed:', updateErr.message)
    process.exit(1)
}

console.log('✅ Role updated:', updated)

// 2. Verify final state
const { data: all } = await supabase
    .from('users')
    .select('email, role, full_name')
    .order('role')

console.log('\n── Final user list ────────────────────────────────')
for (const u of all) {
    console.log(`  [${u.role.padEnd(7)}] ${u.email.padEnd(32)} — ${u.full_name}`)
}
