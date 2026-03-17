
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'event_staff' })
    if (error) {
        // Fallback: try to select one row and see keys
        const { data: rows, error: selError } = await supabase.from('event_staff').select('*').limit(1)
        if (rows && rows.length > 0) {
            console.log("COLUMNS:", Object.keys(rows[0]))
        } else {
            console.error("Could not determine columns", selError)
        }
    } else {
        console.log("COLUMNS:", data)
    }
}

checkColumns()
