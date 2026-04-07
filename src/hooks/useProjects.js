import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'

export function useProjects() {
  const user = useAuthStore((s) => s.user)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setProjects(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = async (payload) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, user_id: user.id })
      .select('*, clients(name)')
      .single()
    if (error) throw error
    setProjects((prev) => [data, ...prev])
    logActivity({
      type: 'project.created',
      entity_type: 'project',
      entity_id: data.id,
      entity_name: data.name,
    })
    return data
  }

  const updateProject = async (id, payload) => {
    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select('*, clients(name)')
      .single()
    if (error) throw error
    setProjects((prev) => prev.map((p) => (p.id === id ? data : p)))
    logActivity({
      type: 'project.updated',
      entity_type: 'project',
      entity_id: data.id,
      entity_name: data.name,
    })
    return data
  }

  const deleteProject = async (id) => {
    const p = projects.find((x) => x.id === id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    setProjects((prev) => prev.filter((x) => x.id !== id))
    if (p) {
      logActivity({
        type: 'project.deleted',
        entity_type: 'project',
        entity_id: id,
        entity_name: p.name,
      })
    }
  }

  return { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject }
}
