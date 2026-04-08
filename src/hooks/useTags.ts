import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { Tag, TagUpdate } from '../types'

export interface UseTagsResult {
  tags: Tag[]
  loading: boolean
  create: (name: string, color: string) => Promise<Tag>
  update: (id: string, payload: TagUpdate) => Promise<Tag>
  remove: (id: string) => Promise<void>
  byId: (id: string) => Tag | undefined
  fetch: () => Promise<void>
}

export function useTags(): UseTagsResult {
  const user = useAuthStore((s) => s.user)
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })
    setTags((data as Tag[] | null) || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const create = async (name: string, color: string): Promise<Tag> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, color, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    const tag = data as Tag
    setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
    return tag
  }

  const update = async (id: string, payload: TagUpdate): Promise<Tag> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('tags')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const tag = data as Tag
    setTags((prev) => prev.map((t) => (t.id === id ? tag : t)))
    return tag
  }

  const remove = async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) throw error
    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  const byId = (id: string): Tag | undefined => tags.find((t) => t.id === id)

  return { tags, loading, create, update, remove, byId, fetch }
}
