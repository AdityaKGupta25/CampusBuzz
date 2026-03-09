
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function probeClubsFk() {
    const { data, error } = await supabase.rpc('get_table_fks', { table_name: 'clubs' })
    if (error) {
        // Fallback: try to select just 'faculty' and see if it works without explicitly naming FK
        const { data: d2, error: e2 } = await supabase.from('clubs').select('id, faculty:users(full_name)').limit(1)
        console.log('Join result:', d2, 'Error:', e2?.message)
    } else {
        console.log('FKs:', data)
    }
}

probeClubsFk()
