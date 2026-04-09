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
  Invoice,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceItem,
  InvoiceItemDraft,
  InvoiceWithRelations,
  PaginatedResult,
  PaginationParams,
} from '../types'

const DEFAULT_PAGE_SIZE = 50

export interface UseInvoicesResult {
  invoices: InvoiceWithRelations[]
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
  fetchInvoices: () => Promise<unknown>
  createInvoice: (payload: InvoiceInsert, items?: InvoiceItemDraft[]) => Promise<Invoice>
  updateInvoice: (
    id: string,
    payload: InvoiceUpdate,
    items?: InvoiceItemDraft[]
  ) => Promise<InvoiceWithRelations>
  deleteInvoice: (id: string) => Promise<string>
  fetchInvoiceWithItems: (
    id: string
  ) => Promise<{ invoice: InvoiceWithRelations | null; items: InvoiceItem[] }>
  generateInvoiceNumber: () => Promise<string>
}

export function useInvoices({
  initialPage = 0,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: PaginationParams = {}): UseInvoicesResult {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [page, setPage] = useState<number>(initialPage)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)

  const queryKey = ['invoices', user?.id, page, pageSize] as const

  const query = useQuery<PaginatedResult<InvoiceWithRelations>, Error>({
    queryKey,
    enabled: !!supabase && !!user,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured')
      const from = page * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await supabase
        .from('invoices')
        .select('*, clients(name, company), projects(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error

      const today = new Date().toISOString().slice(0, 10)
      const rows = (data as InvoiceWithRelations[] | null) || []
      const toOverdue = rows.filter(
        (i) => i.status === 'sent' && i.due_date && i.due_date < today
      )
      let finalRows: InvoiceWithRelations[] = rows
      if (toOverdue.length > 0) {
        await Promise.all(
          toOverdue.map((i) =>
            supabase!.from('invoices').update({ status: 'overdue' }).eq('id', i.id)
          )
        )
        finalRows = rows.map((i) =>
          toOverdue.find((x) => x.id === i.id)
            ? { ...i, status: 'overdue' as const }
            : i
        )
      }
      return { rows: finalRows, count: count ?? 0 }
    },
  })

  const invoices: InvoiceWithRelations[] = query.data?.rows ?? []
  const totalCount: number = query.data?.count ?? 0

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] }),
    [queryClient, user?.id]
  )

  useRealtimeSync('invoices', invalidate)

  const generateInvoiceNumber = async (): Promise<string> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    return `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`
  }

  const createMutation = useMutation<
    Invoice,
    Error,
    { payload: InvoiceInsert; items?: InvoiceItemDraft[] }
  >({
    mutationFn: async ({ payload, items = [] }) => {
      if (!supabase || !user) throw new Error('Not authenticated')
      const subtotal = items.reduce(
        (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
        0
      )
      const taxRate = Number(payload.tax_rate || 0)
      const taxAmount = (subtotal * taxRate) / 100
      const total = subtotal + taxAmount
      const number = payload.number || (await generateInvoiceNumber())

      const { data: inv, error } = await supabase
        .from('invoices')
        .insert({
          ...payload,
          number,
          subtotal,
          tax_amount: taxAmount,
          total,
          user_id: user.id,
        })
        .select()
        .single()
      if (error) throw error
      const invoice = inv as Invoice

      if (items.length) {
        const toInsert = items.map((it, i) => ({
          invoice_id: invoice.id,
          description: it.description,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          amount: Number(it.quantity || 0) * Number(it.unit_price || 0),
          position: i,
        }))
        await supabase.from('invoice_items').insert(toInsert)
      }

      logActivity({
        type: 'invoice.created',
        entity_type: 'invoice',
        entity_id: invoice.id,
        entity_name: invoice.number,
        metadata: { total: invoice.total },
      })

      return invoice
    },
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation<
    InvoiceWithRelations,
    Error,
    { id: string; payload: InvoiceUpdate; items?: InvoiceItemDraft[] }
  >({
    mutationFn: async ({ id, payload, items }) => {
      if (!supabase) throw new Error('Supabase not configured')
      let update: InvoiceUpdate & {
        subtotal?: number
        tax_amount?: number
        total?: number
      } = { ...payload }
      if (items) {
        const subtotal = items.reduce(
          (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
          0
        )
        const taxRate = Number(payload.tax_rate ?? 0)
        const taxAmount = (subtotal * taxRate) / 100
        update = {
          ...update,
          subtotal,
          tax_amount: taxAmount,
          total: subtotal + taxAmount,
        }
      }
      const { data, error } = await supabase
        .from('invoices')
        .update(update)
        .eq('id', id)
        .select('*, clients(name, company), projects(name)')
        .single()
      if (error) throw error

      if (items) {
        await supabase.from('invoice_items').delete().eq('invoice_id', id)
        const toInsert = items.map((it, i) => ({
          invoice_id: id,
          description: it.description,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          amount: Number(it.quantity || 0) * Number(it.unit_price || 0),
          position: i,
        }))
        if (toInsert.length) await supabase.from('invoice_items').insert(toInsert)
      }
      return data as InvoiceWithRelations
    },
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      if (!supabase) throw new Error('Supabase not configured')
      const inv = invoices.find((i) => i.id === id)
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error
      if (inv) {
        logActivity({
          type: 'invoice.deleted',
          entity_type: 'invoice',
          entity_id: id,
          entity_name: inv.number,
        })
      }
      return id
    },
    onSuccess: () => invalidate(),
  })

  const fetchInvoiceWithItems = async (
    id: string
  ): Promise<{ invoice: InvoiceWithRelations | null; items: InvoiceItem[] }> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data: inv } = await supabase
      .from('invoices')
      .select('*, clients(name, company, email), projects(name)')
      .eq('id', id)
      .single()
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('position', { ascending: true })
    return {
      invoice: (inv as InvoiceWithRelations | null) ?? null,
      items: (items as InvoiceItem[] | null) || [],
    }
  }

  // Backward-compatible wrappers
  const createInvoice = (payload: InvoiceInsert, items?: InvoiceItemDraft[]) =>
    createMutation.mutateAsync({ payload, items })
  const updateInvoice = (
    id: string,
    payload: InvoiceUpdate,
    items?: InvoiceItemDraft[]
  ) => updateMutation.mutateAsync({ id, payload, items })
  const deleteInvoice = (id: string) => deleteMutation.mutateAsync(id)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasNextPage = page < totalPages - 1
  const hasPrevPage = page > 0

  return {
    invoices,
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
    fetchInvoices: () => query.refetch(),
    createInvoice,
    updateInvoice,
    deleteInvoice,
    fetchInvoiceWithItems,
    generateInvoiceNumber,
  }
}
