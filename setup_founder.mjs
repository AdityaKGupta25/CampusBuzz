import { createClient } from '@supabase/supabase-js'

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio'
const URL = 'https://eeomuefujtyquhgpcmft.supabase.co'

const supabase = createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

const FOUNDER_EMAIL = 'adityavyas2610@gmail.com'
const FOUNDER_PASSWORD = 'Founder123456'   // ← you can change this

console.log('\n╔══════════════════════════════════════════════════╗')
console.log('║       Founder Account Setup                      ║')
console.log('╚══════════════════════════════════════════════════╝\n')

// 1. Check if auth user already exists
const { data: listData, error: listErr } = await supabase.auth.admin.listUsers()
if (listErr) { console.error('Cannot list users:', listErr.message); process.exit(1) }

const existingAuthUser = listData.users.find(u => u.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase())

let authUserId

if (existingAuthUser) {
    console.log(`✅ Auth account already exists for ${FOUNDER_EMAIL}`)
    console.log(`   Auth UID: ${existingAuthUser.id}`)

    // Update password to known value
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        password: FOUNDER_PASSWORD,
        email_confirm: true,
    })
    if (updateErr) console.error('   ⚠️  Could not update password:', updateErr.message)
    else console.log(`   🔑 Password reset to: ${FOUNDER_PASSWORD}`)

    authUserId = existingAuthUser.id
} else {
    // Create a brand new auth account
    console.log(`🆕 Creating auth account for ${FOUNDER_EMAIL}...`)
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: FOUNDER_EMAIL,
        password: FOUNDER_PASSWORD,
        email_confirm: true,   // skip email verification
    })
    if (createErr) { console.error('❌ Failed to create auth user:', createErr.message); process.exit(1) }
    console.log(`✅ Auth account created!`)
    console.log(`   Auth UID: ${newUser.user.id}`)
    authUserId = newUser.user.id
}

// 2. Check / create public.users row for founder
const { data: existingProfile } = await supabase
    .from('users')
    .select('id, email, role, auth_uid, full_name')
    .eq('email', FOUNDER_EMAIL)
    .single()

if (existingProfile) {
    console.log(`\n✅ public.users row exists:`)
    console.log(`   Name: ${existingProfile.full_name}`)
    console.log(`   Role: ${existingProfile.role}`)
    console.log(`   Auth linked: ${existingProfile.auth_uid ? 'YES' : 'NO'}`)

    // Link auth_uid if missing
    if (!existingProfile.auth_uid) {
        await supabase.from('users').update({ auth_uid: authUserId, role: 'admin' }).eq('email', FOUNDER_EMAIL)
        console.log(`   🔗 Auth UID linked & role set to admin`)
    }
} else {
    // Need a valid department_id — grab the first one
    const { data: dept } = await supabase.from('departments').select('id').limit(1).single()

    const { error: insertErr } = await supabase.from('users').insert({
        full_name: 'Aditya (Founder)',
        email: FOUNDER_EMAIL,
        role: 'admin',
        auth_uid: authUserId,
        department_id: dept?.id ?? null,
    })
    if (insertErr) console.error('⚠️  Could not create public.users row:', insertErr.message)
    else console.log(`\n✅ public.users row created with role=admin`)
}

console.log('\n══════════════════════════════════════════════════')
console.log('  LOGIN CREDENTIALS')
console.log('══════════════════════════════════════════════════')
console.log(`  URL      : http://localhost:3000/login`)
console.log(`  Email    : ${FOUNDER_EMAIL}`)
console.log(`  Password : ${FOUNDER_PASSWORD}`)
console.log('\n  After login → navigate to: http://localhost:3000/founder')
console.log('══════════════════════════════════════════════════\n')
