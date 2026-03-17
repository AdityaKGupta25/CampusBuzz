
const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

async function getSwaggerDetail() {
    try {
        const res = await fetch(supabaseUrl, {
            headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
        })
        const json = await res.json()
        console.log("EVENT_STAFF COLUMNS:", Object.keys(json.definitions.event_staff.properties))
    } catch (err) {
        console.error(err)
    }
}
getSwaggerDetail()
