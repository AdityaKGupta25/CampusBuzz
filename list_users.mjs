
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debug() {
    const { data: users, error } = await supabase.from('users').select('full_name, role, email')
    console.log('--- ALL USERS ---')
    if (users && users.length > 0) {
        users.forEach(u => console.log(`${u.email}: ${u.role} (${u.full_name})`))
    } else {
        console.log('No users found in public.users table.')
    }
}

debug()
