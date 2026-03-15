
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('event_staff').select('*').limit(1);
  console.log('Error:', error);
  if (data && data[0]) {
    console.log('Columns:', Object.keys(data[0]));
  }
}
check();
