
const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

async function getSwagger() {
    try {
        const res = await fetch(supabaseUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        })
        const json = await res.json()
        if (json.definitions && json.definitions.clubs) {
            console.log('Clubs Columns:', Object.keys(json.definitions.clubs.properties))
        } else {
            console.log('Clubs definition not found in swagger')
        }
    } catch (err) {
        console.error('Fetch error:', err.message)
    }
}

getSwagger()
