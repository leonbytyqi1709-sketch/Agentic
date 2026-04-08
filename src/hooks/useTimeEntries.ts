import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { TimeEntryInsert, TimeEntryWithProject } from '../types'

export interface UseTimeEntriesResult {
  entries: TimeEntryWithProject[]
  loading: boolean
  fetchEntries: () => Promise<void>
  createEntry: (payload: TimeEntryInsert) => Promise<TimeEntryWithProject>
  deleteEntry: (id: string) => Promise<void>
  totalSeconds: number
}

export function useTimeEntries(projectId?: string): UseTimeEntriesResult {
  const user = useAuthStore((s) => s.user)
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    let q = supabase
      .from('time_entries')
      .select('*, projects(name)')
      .order('started_at', { ascending: false })
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    setEntries((data as TimeEntryWithProject[] | null) || [])
    setLoading(false)
  }, [user, projectId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const createEntry = async (
    payload: TimeEntryInsert
  ): Promise<TimeEntryWithProject> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('time_entries')
      .insert({ ...payload, user_id: user.id })
      .select('*, projects(name)')
      .single()
    if (error) throw error
    const entry = data as TimeEntryWithProject
    setEntries((prev) => [entry, ...prev])
    return entry
  }

  const deleteEntry = async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (error) throw error
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const totalSeconds = entries.reduce(
    (s, e) => s + (e.duration_seconds || 0),
    0
  )

  return { entries, loading, fetchEntries, createEntry, deleteEntry, totalSeconds }
}
