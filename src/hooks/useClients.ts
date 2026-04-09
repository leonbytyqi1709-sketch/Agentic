import { useCallback, useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { useRealtimeSync } from './useRealtimeSync.js'
import { logActivity } from '../lib/activity.js'
import type {
  Client,
  ClientInsert,
  ClientUpdate,
  PaginatedResult,
  PaginationParams,
} from '../types'

const DEFAULT_PAGE_SIZE = 50

export interface UseClientsResult {
  clients: Client[]
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
  fetchClients: () => Promise<unknown>
  createClient: (payload: ClientInsert) => Promise<Client>
  updateClient: (id: string, payload: ClientUpdate) => Promise<Client>
  deleteClient: (id: string) => Promise<string>
}

export function useClients({
  initialPage = 0,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: PaginationParams = {}): UseClientsResult {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [page, setPage] = useState<number>(initialPage)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)

  const queryKey = ['clients', user?.id, page, pageSize] as const

  const query = useQuery<PaginatedResult<Client>, Error>({
    queryKey,
    enabled: !!supabase && !!user,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured')
      const from = page * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return { rows: (data as Client[] | null) || [], count: count ?? 0 }
    },
  })

  const clients: Client[] = query.data?.rows ?? []
  const totalCount: number = query.data?.count ?? 0

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['clients', user?.id] }),
    [queryClient, user?.id]
  )

  useRealtimeSync('clients', invalidate)

  const createMutation = useMutation<Client, Error, ClientInsert>({
    mutationFn: async (payload) => {
      if (!supabase || !user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      const client = data as Client
      logActivity({
        type: 'client.created',
        entity_type: 'client',
        entity_id: client.id,
        entity_name: client.name,
      })
      return client
    },
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation<
    Client,
    Error,
    { id: string; payload: ClientUpdate }
  >({
    mutationFn: async ({ id, payload }) => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const client = data as Client
      logActivity({
        type: 'client.updated',
        entity_type: 'client',
        entity_id: client.id,
        entity_name: client.name,
      })
      return client
    },
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      if (!supabase) throw new Error('Supabase not configured')
      const c = clients.find((x) => x.id === id)
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
      if (c) {
        logActivity({
          type: 'client.deleted',
          entity_type: 'client',
          entity_id: id,
          entity_name: c.name,
        })
      }
      return id
    },
    onSuccess: () => invalidate(),
  })

  const createClient = (payload: ClientInsert) =>
    createMutation.mutateAsync(payload)
  const updateClient = (id: string, payload: ClientUpdate) =>
    updateMutation.mutateAsync({ id, payload })
  const deleteClient = (id: string) => deleteMutation.mutateAsync(id)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasNextPage = page < totalPages - 1
  const hasPrevPage = page > 0

  return {
    clients,
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
    fetchClients: () => query.refetch(),
    createClient,
    updateClient,
    deleteClient,
  }
}
