
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
    console.log('--- CHECKING USERS TABLE STRUCTURE ---')
    // We can't use rpc if it's not defined, so let's try a simple select with a limit 0
    const { data, error } = await supabase.from('users').select('*').limit(1)

    if (error) {
        console.error('Error fetching from users:', error.message)
        // If it's a permission error, we still get column info in some environments, 
        // but here we might just get RLS blocking.
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]))
    } else {
        console.log('Table is empty or no columns returned.')
    }
}

checkSchema()
