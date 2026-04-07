import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'

export function useActivities(limit = 15) {
  const user = useAuthStore((s) => s.user)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    setActivities(data || [])
    setLoading(false)
  }, [user, limit])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { activities, loading, refetch: fetch }
}
