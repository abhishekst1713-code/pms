import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://xewntbytnytyuytahwuz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld250Ynl0bnl0eXV5dGFod3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgzMDY0MCwiZXhwIjoyMDg5NDA2NjQwfQ.FRixAHWbhs1eJRfwbP0vFUKsWHXIHoSoeGg9YsKoVd8'
)

const { data, error } = await s.from('users').select('id').limit(1)
console.log('data:', data)
console.log('error:', error)