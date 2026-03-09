
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function probeClubs() {
    // Try to find columns by selecting * and checking the error if RLS or something blocks it
    const { data, error, status } = await supabase.from('clubs').select('*')
    console.log('Status:', status)
    if (error) {
        console.error('Error:', error.message)
    } else {
        console.log('Data:', data)
        // If data is empty array, we still don't know columns.
        // Let's try to insert to see columns
        const { error: insError } = await supabase.from('clubs').insert({}).select()
        console.log('Insert Error:', insError?.message)
    }
}

probeClubs()
