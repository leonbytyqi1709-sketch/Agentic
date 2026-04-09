import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { EmailPin, EmailPinInsert } from '../types'

export interface UseEmailPinsArgs {
  clientId?: string
  projectId?: string
}

export interface UseEmailPinsResult {
  pins: EmailPin[]
  loading: boolean
  fetch: () => Promise<void>
  pinEmail: (payload: EmailPinInsert) => Promise<EmailPin>
  unpin: (id: string) => Promise<void>
  isPinned: (gmailMessageId: string) => boolean
}

export function useEmailPins(args: UseEmailPinsArgs = {}): UseEmailPinsResult {
  const user = useAuthStore((s) => s.user)
  const [pins, setPins] = useState<EmailPin[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    let q = supabase
      .from('email_pins')
      .select('*')
      .order('pinned_at', { ascending: false })
    if (args.clientId) q = q.eq('client_id', args.clientId)
    if (args.projectId) q = q.eq('project_id', args.projectId)
    const { data } = await q
    setPins((data as EmailPin[] | null) || [])
    setLoading(false)
  }, [user, args.clientId, args.projectId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const pinEmail = useCallback(
    async (payload: EmailPinInsert): Promise<EmailPin> => {
      if (!supabase || !user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('email_pins')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      const pin = data as EmailPin
      setPins((prev) => [pin, ...prev])
      return pin
    },
    [user]
  )

  const unpin = useCallback(async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('email_pins').delete().eq('id', id)
    if (error) throw error
    setPins((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const isPinned = useCallback(
    (gmailMessageId: string): boolean =>
      pins.some((p) => p.gmail_message_id === gmailMessageId),
    [pins]
  )

  return { pins, loading, fetch, pinEmail, unpin, isPinned }
}
