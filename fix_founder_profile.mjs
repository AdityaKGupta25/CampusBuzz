import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://eeomuefujtyquhgpcmft.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio',
    { auth: { autoRefreshToken: false, persistSession: false } }
)

const FOUNDER_EMAIL = 'adityavyas2610@gmail.com'
const NEW_AUTH_UID = 'c29ff130-9eb5-4d93-a9a3-54c098063ddd'  // created by setup_founder.mjs

// Update public.users row: correct auth_uid + role=admin + proper name
const { data, error } = await supabase
    .from('users')
    .update({
        auth_uid: NEW_AUTH_UID,
        role: 'admin',
        full_name: 'Aditya (Founder)',
    })
    .eq('email', FOUNDER_EMAIL)
    .select('email, role, full_name, auth_uid')
    .single()

if (error) { console.error('❌ Update failed:', error.message); process.exit(1) }

console.log('\n✅ Founder profile fixed:')
console.log(`   Email    : ${data.email}`)
console.log(`   Name     : ${data.full_name}`)
console.log(`   Role     : ${data.role}`)
console.log(`   Auth UID : ${data.auth_uid}`)
console.log('\n  → Login at : http://localhost:3000/login')
console.log('  → Email    : adityavyas2610@gmail.com')
console.log('  → Password : Founder123456')
console.log('  → Then go  : http://localhost:3000/founder\n')
