import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'

export function useTimeEntries(projectId) {
  const user = useAuthStore((s) => s.user)
  const [entries, setEntries] = useState([])
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
    setEntries(data || [])
    setLoading(false)
  }, [user, projectId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const createEntry = async (payload) => {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({ ...payload, user_id: user.id })
      .select('*, projects(name)')
      .single()
    if (error) throw error
    setEntries((prev) => [data, ...prev])
    return data
  }

  const deleteEntry = async (id) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (error) throw error
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const totalSeconds = entries.reduce((s, e) => s + (e.duration_seconds || 0), 0)

  return { entries, loading, fetchEntries, createEntry, deleteEntry, totalSeconds }
}
