import { useEffect, useState, useCallback, useId } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'
import type { Task, TaskInsert, TaskUpdate } from '../types'

export interface TaskWithProject extends Task {
  projects?: { name: string } | null
}

export interface UseTasksResult {
  tasks: TaskWithProject[]
  loading: boolean
  fetchTasks: () => Promise<void>
  createTask: (payload: TaskInsert) => Promise<TaskWithProject>
  updateTask: (id: string, payload: TaskUpdate) => Promise<TaskWithProject>
  deleteTask: (id: string) => Promise<void>
}

export function useTasks(projectId?: string): UseTasksResult {
  const user = useAuthStore((s) => s.user)
  const instanceId = useId()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const selectStr = projectId ? '*' : '*, projects(name)'
    let q = supabase
      .from('tasks')
      .select(selectStr)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    setTasks((data as unknown as TaskWithProject[] | null) || [])
    setLoading(false)
  }, [user, projectId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Realtime
  useEffect(() => {
    if (!supabase || !user) return
    const channel = supabase
      .channel(`tasks-${projectId || 'all'}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks()
      )
      .subscribe()
    return () => {
      supabase!.removeChannel(channel)
    }
  }, [user, projectId, instanceId, fetchTasks])

  const createTask = useCallback(
    async (payload: TaskInsert): Promise<TaskWithProject> => {
      if (!supabase || !user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      const task = data as TaskWithProject
      setTasks((prev) => [...prev, task])
      logActivity({
        type: 'task.created',
        entity_type: 'task',
        entity_id: task.id,
        entity_name: task.title,
      })
      return task
    },
    [user]
  )

  const updateTask = useCallback(
    async (id: string, payload: TaskUpdate): Promise<TaskWithProject> => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const task = data as TaskWithProject
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
      return task
    },
    []
  )

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
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
    },
    [tasks]
  )

  return { tasks, loading, fetchTasks, createTask, updateTask, deleteTask }
}
