import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'

export function useTasks(projectId) {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    let q = supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    setTasks(data || [])
    setLoading(false)
  }, [user, projectId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Realtime
  useEffect(() => {
    if (!supabase || !user) return
    const channel = supabase
      .channel(`tasks-${projectId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, projectId, fetchTasks])

  const createTask = async (payload) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setTasks((prev) => [...prev, data])
    logActivity({
      type: 'task.created',
      entity_type: 'task',
      entity_id: data.id,
      entity_name: data.title,
    })
    return data
  }

  const updateTask = async (id, payload) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTasks((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }

  const deleteTask = async (id) => {
    const t = tasks.find((x) => x.id === id)
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    setTasks((prev) => prev.filter((x) => x.id !== id))
    if (t) {
      logActivity({
        type: 'task.deleted',
        entity_type: 'task',
        entity_id: id,
        entity_name: t.title,
      })
    }
  }

  return { tasks, loading, fetchTasks, createTask, updateTask, deleteTask }
}
