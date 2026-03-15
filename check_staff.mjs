
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkColumns() {
  const { data, error } = await supabase.from('event_staff').select('*').limit(1)
  if (error) {
    console.error(error)
    return
  }
  if (data && data.length > 0) {
    console.log('Columns in event_staff:', Object.keys(data[0]))
    console.log('Sample data:', data[0])
  } else {
    console.log('No data in event_staff')
  }
}

checkColumns()
