import { supabase } from './supabase.js'

export async function logActivity({ type, entity_type, entity_id, entity_name, metadata }) {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activities').insert({
    user_id: user.id,
    type,
    entity_type,
    entity_id,
    entity_name,
    metadata,
  })
}
