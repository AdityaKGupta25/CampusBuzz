
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkColumns() {
    console.log('--- TESTING COLUMN EXISTENCE ---')

    const { error: err1 } = await supabase.from('users').select('auth_uid').limit(1)
    console.log('auth_uid column exists?', !err1 || !err1.message.includes('column "auth_uid" does not exist'))
    if (err1) console.log('Error 1:', err1.message)

    const { error: err2 } = await supabase.from('users').select('id').limit(1)
    console.log('id column exists?', !err2 || !err2.message.includes('column "id" does not exist'))

    const { error: err3 } = await supabase.from('users').select('email').limit(1)
    console.log('email column exists?', !err3 || !err3.message.includes('column "email" does not exist'))
}

checkColumns()
