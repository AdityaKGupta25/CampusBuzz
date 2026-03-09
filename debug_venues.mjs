
const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

async function checkVenues() {
    try {
        const res = await fetch(supabaseUrl + 'venues?select=*', {
            headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
        })
        const data = await res.json()
        console.log('Venues Data:', data)

        const res2 = await fetch(supabaseUrl, {
            headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
        })
        const swagger = await res2.json()
        console.log('Venues Definition:', JSON.stringify(swagger.definitions.venues.properties, null, 2))
    } catch (err) {
        console.error(err)
    }
}
checkVenues()
