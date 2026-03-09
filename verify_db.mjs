import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkColumns() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching events:', error);
    } else {
        console.log('Columns in events table:', Object.keys(data[0] || {}));
    }

    const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .limit(1);

    if (clubsError) {
        console.error('Error fetching clubs:', clubsError);
    } else {
        console.log('Clubs table exists and has columns:', Object.keys(clubsData[0] || {}));
    }

    const { data: roundsData, error: roundsError } = await supabase
        .from('event_rounds')
        .select('*')
        .limit(1);

    if (roundsError) {
        console.error('Error fetching event_rounds:', roundsError);
    } else {
        console.log('event_rounds table exists and has columns:', Object.keys(roundsData[0] || {}));
    }
}

checkColumns();
