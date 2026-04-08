import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'
import type { Task, TaskInsert, TaskUpdate } from '../types'

export interface UseTasksResult {
  tasks: Task[]
  loading: boolean
  fetchTasks: () => Promise<void>
  createTask: (payload: TaskInsert) => Promise<Task>
  updateTask: (id: string, payload: TaskUpdate) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
}

export function useTasks(projectId?: string): UseTasksResult {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<Task[]>([])
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
    setTasks((data as Task[] | null) || [])
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
      supabase!.removeChannel(channel)
    }
  }, [user, projectId, fetchTasks])

  const createTask = async (payload: TaskInsert): Promise<Task> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    const task = data as Task
    setTasks((prev) => [...prev, task])
    logActivity({
      type: 'task.created',
      entity_type: 'task',
      entity_id: task.id,
      entity_name: task.title,
    })
    return task
  }

  const updateTask = async (id: string, payload: TaskUpdate): Promise<Task> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const task = data as Task
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
    return task
  }

  const deleteTask = async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
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
