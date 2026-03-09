import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'event_staff' })
    if (error) {
        console.error('RPC get_table_columns error:', error.message)
        // If RPC isn't available, we try a common Hack: try to insert an empty object to see the error message with column info
        const { error: insertError } = await supabase.from('event_staff').insert({}).select()
        if (insertError) {
            console.error('Insert error (hint for columns):', insertError.message)
        }
    } else {
        console.log('Columns from RPC:', data)
    }
}

checkColumns()
