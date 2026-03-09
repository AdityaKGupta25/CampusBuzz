
const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const venues = [
    { name: 'Main Auditorium', capacity: 1200, is_active: true },
    { name: 'Conference Hall A', capacity: 250, is_active: true },
    { name: 'Open Air Theater', capacity: 5000, is_active: true },
    { name: 'Seminar Hall 101', capacity: 120, is_active: true },
    { name: 'Tech Park Square', capacity: 2000, is_active: true }
]

async function seedVenues() {
    try {
        console.log('Seeding venues...')
        const res = await fetch(supabaseUrl + 'venues', {
            method: 'POST',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(venues)
        })
        const data = await res.json()
        console.log('Result:', data)
    } catch (err) {
        console.error(err)
    }
}

seedVenues()
