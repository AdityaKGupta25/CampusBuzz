
const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

async function countClubs() {
    try {
        const res = await fetch(supabaseUrl + 'clubs?select=count', {
            headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}`, 'Prefer': 'count=exact' }
        })
        const count = res.headers.get('content-range')
        console.log('Total Clubs (Count):', count)
    } catch (err) {
        console.error(err)
    }
}
countClubs()
