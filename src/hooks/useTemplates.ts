import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { ProjectTemplate, ProjectTemplateInsert, ProjectTemplateUpdate } from '../types'

export interface UseTemplatesResult {
  templates: ProjectTemplate[]
  loading: boolean
  create: (payload: ProjectTemplateInsert) => Promise<ProjectTemplate>
  update: (id: string, payload: ProjectTemplateUpdate) => Promise<ProjectTemplate>
  remove: (id: string) => Promise<void>
  fetch: () => Promise<void>
}

export function useTemplates(): UseTemplatesResult {
  const user = useAuthStore((s) => s.user)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('project_templates')
      .select('*')
      .order('created_at', { ascending: false })
    setTemplates((data as ProjectTemplate[] | null) || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const create = async (payload: ProjectTemplateInsert): Promise<ProjectTemplate> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('project_templates')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    const t = data as ProjectTemplate
    setTemplates((prev) => [t, ...prev])
    return t
  }

  const update = async (
    id: string,
    payload: ProjectTemplateUpdate
  ): Promise<ProjectTemplate> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('project_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const t = data as ProjectTemplate
    setTemplates((prev) => prev.map((x) => (x.id === id ? t : x)))
    return t
  }

  const remove = async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('project_templates').delete().eq('id', id)
    if (error) throw error
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return { templates, loading, create, update, remove, fetch }
}
