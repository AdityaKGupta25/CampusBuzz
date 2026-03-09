import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://eeomuefujtyquhgpcmft.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio',
    { auth: { autoRefreshToken: false, persistSession: false } }
)

const NEW_EMAIL = 'adityakgpc2507@gmail.com'
const OLD_EMAIL = 'adityavyas2610@gmail.com'
const PASSWORD = 'Founder@CampusBuzz2025'

// 1. Check if new email already has auth account
const { data: { users } } = await supabase.auth.admin.listUsers()
const existing = users.find(u => u.email?.toLowerCase() === NEW_EMAIL.toLowerCase())

let authUid

if (existing) {
    console.log(`✅ Auth account already exists for ${NEW_EMAIL} (${existing.id})`)
    await supabase.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true })
    console.log(`   🔑 Password set to: ${PASSWORD}`)
    authUid = existing.id
} else {
    const { data, error } = await supabase.auth.admin.createUser({
        email: NEW_EMAIL,
        password: PASSWORD,
        email_confirm: true,
    })
    if (error) { console.error('❌ Create failed:', error.message); process.exit(1) }
    console.log(`✅ Auth account created: ${NEW_EMAIL} (${data.user.id})`)
    authUid = data.user.id
}

// 2. Upsert public.users row for new email
const { data: dept } = await supabase.from('departments').select('id').limit(1).single()

const { error: upsertErr } = await supabase.from('users').upsert({
    email: NEW_EMAIL,
    full_name: 'Aditya (Founder)',
    role: 'admin',
    auth_uid: authUid,
    department_id: dept?.id ?? null,
}, { onConflict: 'email' })

if (upsertErr) console.error('⚠️  public.users upsert:', upsertErr.message)
else console.log(`✅ public.users row ready (role=admin)`)

// 3. Demote old email's public.users row (optional safety)
await supabase.from('users').update({ role: 'student' }).eq('email', OLD_EMAIL)
console.log(`ℹ️  Old email (${OLD_EMAIL}) demoted to student in public.users`)

console.log('\n══════════════════════════════════════════════════')
console.log('  FOUNDER LOGIN')
console.log('══════════════════════════════════════════════════')
console.log(`  URL      : http://localhost:3000/login`)
console.log(`  Email    : ${NEW_EMAIL}`)
console.log(`  Password : ${PASSWORD}`)
console.log(`  Redirects to: /founder`)
console.log('══════════════════════════════════════════════════\n')
