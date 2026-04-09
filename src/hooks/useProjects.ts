import { useCallback, useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'
import { useRealtimeSync } from './useRealtimeSync.js'
import type {
  ProjectInsert,
  ProjectUpdate,
  ProjectWithClient,
  PaginatedResult,
  PaginationParams,
} from '../types'

const DEFAULT_PAGE_SIZE = 50

export interface UseProjectsResult {
  projects: ProjectWithClient[]
  loading: boolean
  error: string | null
  isFetching: boolean
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  fetchProjects: () => Promise<unknown>
  createProject: (payload: ProjectInsert) => Promise<ProjectWithClient>
  updateProject: (id: string, payload: ProjectUpdate) => Promise<ProjectWithClient>
  deleteProject: (id: string) => Promise<string>
}

export function useProjects({
  initialPage = 0,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: PaginationParams = {}): UseProjectsResult {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [page, setPage] = useState<number>(initialPage)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)

  const queryKey = ['projects', user?.id, page, pageSize] as const

  const query = useQuery<PaginatedResult<ProjectWithClient>, Error>({
    queryKey,
    enabled: !!supabase && !!user,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured')
      const from = page * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('projects')
        .select('*, clients(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return {
        rows: (data as ProjectWithClient[] | null) || [],
        count: count ?? 0,
      }
    },
  })

  const projects: ProjectWithClient[] = query.data?.rows ?? []
  const totalCount: number = query.data?.count ?? 0

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['projects', user?.id] }),
    [queryClient, user?.id]
  )

  useRealtimeSync('projects', invalidate)

  const createMutation = useMutation<ProjectWithClient, Error, ProjectInsert>({
    mutationFn: async (payload) => {
      if (!supabase || !user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...payload, user_id: user.id })
        .select('*, clients(name)')
        .single()
      if (error) throw error
      const project = data as ProjectWithClient
      logActivity({
        type: 'project.created',
        entity_type: 'project',
        entity_id: project.id,
        entity_name: project.name,
      })
      return project
    },
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation<
    ProjectWithClient,
    Error,
    { id: string; payload: ProjectUpdate }
  >({
    mutationFn: async ({ id, payload }) => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data, error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', id)
        .select('*, clients(name)')
        .single()
      if (error) throw error
      const project = data as ProjectWithClient
      logActivity({
        type: 'project.updated',
        entity_type: 'project',
        entity_id: project.id,
        entity_name: project.name,
      })
      return project
    },
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      if (!supabase) throw new Error('Supabase not configured')
      const p = projects.find((x) => x.id === id)
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      if (p) {
        logActivity({
          type: 'project.deleted',
          entity_type: 'project',
          entity_id: id,
          entity_name: p.name,
        })
      }
      return id
    },
    onSuccess: () => invalidate(),
  })

  const createProject = (payload: ProjectInsert) =>
    createMutation.mutateAsync(payload)
  const updateProject = (id: string, payload: ProjectUpdate) =>
    updateMutation.mutateAsync({ id, payload })
  const deleteProject = (id: string) => deleteMutation.mutateAsync(id)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasNextPage = page < totalPages - 1
  const hasPrevPage = page > 0

  return {
    projects,
    loading: query.isLoading,
    error: query.error?.message || null,
    isFetching: query.isFetching,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setPage,
    setPageSize,
    fetchProjects: () => query.refetch(),
    createProject,
    updateProject,
    deleteProject,
  }
}
