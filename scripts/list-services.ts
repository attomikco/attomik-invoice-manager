import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, price')
    .order('price', { ascending: true })

  if (error) { console.error(error); process.exit(1) }

  data?.forEach(s => {
    console.log(`\n--- $${s.price} ---`)
    console.log(`Name: ${s.name}`)
    console.log(`Desc: ${s.description}`)
    console.log(`ID:   ${s.id}`)
  })
}

main()
