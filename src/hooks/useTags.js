import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'

export function useTags() {
  const user = useAuthStore((s) => s.user)
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })
    setTags(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const create = async (name, color) => {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, color, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  const update = async (id, payload) => {
    const { data, error } = await supabase
      .from('tags')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTags((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }

  const remove = async (id) => {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) throw error
    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  const byId = (id) => tags.find((t) => t.id === id)

  return { tags, loading, create, update, remove, byId, fetch }
}
