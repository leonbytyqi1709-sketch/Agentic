import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'

export function useTemplates() {
  const user = useAuthStore((s) => s.user)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('project_templates')
      .select('*')
      .order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('project_templates')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setTemplates((prev) => [data, ...prev])
    return data
  }

  const update = async (id, payload) => {
    const { data, error } = await supabase
      .from('project_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }

  const remove = async (id) => {
    const { error } = await supabase.from('project_templates').delete().eq('id', id)
    if (error) throw error
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return { templates, loading, create, update, remove, fetch }
}
