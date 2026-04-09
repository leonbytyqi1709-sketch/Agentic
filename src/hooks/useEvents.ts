import { useEffect, useState, useCallback, useId } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { EventInsert, EventUpdate, EventWithRelations } from '../types'

export interface UseEventsResult {
  events: EventWithRelations[]
  loading: boolean
  fetch: () => Promise<void>
  createEvent: (payload: EventInsert) => Promise<EventWithRelations>
  updateEvent: (id: string, payload: EventUpdate) => Promise<EventWithRelations>
  deleteEvent: (id: string) => Promise<void>
}

export function useEvents(): UseEventsResult {
  const user = useAuthStore((s) => s.user)
  const instanceId = useId()
  const [events, setEvents] = useState<EventWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*, clients(name), projects(name)')
      .order('starts_at', { ascending: true })
    setEvents((data as unknown as EventWithRelations[] | null) || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    if (!supabase || !user) return
    const channel = supabase
      .channel(`events-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetch()
      )
      .subscribe()
    return () => {
      supabase!.removeChannel(channel)
    }
  }, [user, instanceId, fetch])

  const createEvent = useCallback(
    async (payload: EventInsert): Promise<EventWithRelations> => {
      if (!supabase || !user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('events')
        .insert({ ...payload, user_id: user.id })
        .select('*, clients(name), projects(name)')
        .single()
      if (error) throw error
      const ev = data as unknown as EventWithRelations
      setEvents((prev) =>
        [...prev, ev].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        )
      )
      return ev
    },
    [user]
  )

  const updateEvent = useCallback(
    async (id: string, payload: EventUpdate): Promise<EventWithRelations> => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data, error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', id)
        .select('*, clients(name), projects(name)')
        .single()
      if (error) throw error
      const ev = data as unknown as EventWithRelations
      setEvents((prev) =>
        prev
          .map((e) => (e.id === id ? ev : e))
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      )
      return ev
    },
    []
  )

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { events, loading, fetch, createEvent, updateEvent, deleteEvent }
}
