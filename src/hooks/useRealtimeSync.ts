import { useEffect, useId } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'

/**
 * Subscribes to realtime changes on a Supabase table for the current user.
 * Calls `onChange` on any INSERT/UPDATE/DELETE event.
 *
 * Requires: `alter publication supabase_realtime add table <table>` in SQL.
 */
export function useRealtimeSync(
  table: string,
  onChange: () => void,
  key: string = 'all'
): void {
  const user = useAuthStore((s) => s.user)
  const instanceId = useId()

  useEffect(() => {
    if (!supabase || !user) return
    const channel = supabase
      .channel(`rt-${table}-${key}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${user.id}`,
        },
        () => onChange()
      )
      .subscribe()
    return () => {
      supabase!.removeChannel(channel)
    }
  }, [user, table, key, instanceId, onChange])
}
