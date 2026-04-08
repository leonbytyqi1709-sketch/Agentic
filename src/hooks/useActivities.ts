import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { Activity } from '../types'

export interface UseActivitiesResult {
  activities: Activity[]
  loading: boolean
  refetch: () => Promise<void>
}

export function useActivities(limit: number = 15): UseActivitiesResult {
  const user = useAuthStore((s) => s.user)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    setActivities((data as Activity[] | null) || [])
    setLoading(false)
  }, [user, limit])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { activities, loading, refetch: fetch }
}
