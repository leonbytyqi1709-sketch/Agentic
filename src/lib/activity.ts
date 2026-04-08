import { supabase } from './supabase.js'
import type { ActivityInsert } from '../types'

export async function logActivity(payload: ActivityInsert): Promise<void> {
  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activities').insert({
    user_id: user.id,
    type: payload.type,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    entity_name: payload.entity_name ?? null,
    metadata: payload.metadata ?? null,
  })
}
