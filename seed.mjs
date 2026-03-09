
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI1MjcsImV4cCI6MjA4NzUyODUyN30.JZ0BJ6uHO2kLZxpCH9G1YtrjYnsOqEEpc59PyiSuViQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seed() {
    console.log('--- STARTING SEED ---')

    // 1. Departments
    const depts = [
        { name: 'Computer Science', budget_cap: 500000 },
        { name: 'Electronics', budget_cap: 300000 },
        { name: 'Mechanical', budget_cap: 400000 }
    ];

    const { data: dData, error: dErr } = await supabase.from('departments').upsert(depts, { onConflict: 'name' }).select();
    if (dErr) console.error('Depts Error:', dErr);
    else console.log('Depts seeded:', dData?.length);

    console.log('--- SEED FINISHED ---')
    console.log('NOTE: User profiles in public.users are auto-created on SIGN UP via DB trigger.')
    console.log('If you want to promote a user to HOD or Faculty, you must manually change their "role" in the public.users table.')
}

seed()
