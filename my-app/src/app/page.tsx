import { supabase } from '../lib/supabaseclient'

export default async function Page() {
  const { data, error } = await supabase.from('users').select('*')
  console.log(data)

  return <div>Hello</div>
}