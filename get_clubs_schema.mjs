
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getClubsSchema() {
    const { data, error } = await supabase.from('clubs').select('*').limit(1)
    if (error) {
        console.error('Error:', error.message)
    } else {
        // If empty, we can try to find column names via an error or just guess standard ones if not available
        // Actually, let's try a non-existent column to see if it lists others
        const { error: err2 } = await supabase.from('clubs').select('non_existent_column').limit(1)
        console.log('Error message containing columns:', err2?.message)
    }
}

getClubsSchema()
