import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://eeomuefujtyquhgpcmft.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio'
)

const { data: users, error } = await supabase
    .from('users')
    .select('email, role, full_name, auth_uid')
    .order('role')

if (error) { console.error('DB error:', error.message); process.exit(1) }

console.log('\n╔══════════════════════════════════════════════════════╗')
console.log('║               ALL PLATFORM USERS                    ║')
console.log('╚══════════════════════════════════════════════════════╝\n')

const byRole = {}
for (const u of users) {
    if (!byRole[u.role]) byRole[u.role] = []
    byRole[u.role].push(u)
}

for (const [role, list] of Object.entries(byRole)) {
    console.log(`── ${role.toUpperCase()} (${list.length}) ──────────────────────`)
    for (const u of list) {
        const linked = u.auth_uid ? '✅ Auth linked' : '⚠️  No auth account'
        console.log(`   ${u.full_name.padEnd(28)} ${u.email.padEnd(36)} ${linked}`)
    }
    console.log()
}
