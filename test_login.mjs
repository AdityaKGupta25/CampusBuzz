
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugLogin(email) {
    console.log(`--- DEBUG LOGIN FOR ${email} ---`)

    // 1. Sign in
    // Try common passwords since I don't know it, or just check if it fails
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: 'password123' // Guessing, but the goal is to see if it works
    })

    if (authError) {
        console.error('Auth Error:', authError.message)
        return
    }

    const user = authData.user
    console.log('User signed in. ID:', user.id)

    // 2. Query profile
    const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_uid', user.id)
        .single()

    if (profileError) {
        console.error('Profile Fetch Error:', profileError.message)

        // Try querying by email just to see if it exists but ID is wrong
        const { data: byEmail } = await supabase.from('users').select('*').eq('email', email).single()
        if (byEmail) {
            console.log('User found by email, but auth_uid might be wrong.')
            console.log('Record details:', byEmail)
        } else {
            console.log('User not found by email either.')
        }
    } else {
        console.log('Profile found! Role:', profile.role)
    }
}

debugLogin('hod@test.com')
