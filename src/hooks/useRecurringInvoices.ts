import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { useInvoices } from './useInvoices.js'
import type {
  RecurringFrequency,
  RecurringInvoiceInsert,
  RecurringInvoiceUpdate,
  RecurringInvoiceWithRelations,
} from '../types'

function nextDate(date: string, frequency: RecurringFrequency): string {
  const d = new Date(date)
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'quarterly':
      d.setMonth(d.getMonth() + 3)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().slice(0, 10)
}

export interface UseRecurringInvoicesResult {
  recurring: RecurringInvoiceWithRelations[]
  loading: boolean
  create: (payload: RecurringInvoiceInsert) => Promise<RecurringInvoiceWithRelations>
  update: (
    id: string,
    payload: RecurringInvoiceUpdate
  ) => Promise<RecurringInvoiceWithRelations>
  remove: (id: string) => Promise<void>
  fetch: () => Promise<void>
}

export function useRecurringInvoices(): UseRecurringInvoicesResult {
  const user = useAuthStore((s) => s.user)
  const { createInvoice } = useInvoices()
  const [recurring, setRecurring] = useState<RecurringInvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('recurring_invoices')
      .select('*, clients(name), projects(name)')
      .order('next_run', { ascending: true })
    setRecurring((data as RecurringInvoiceWithRelations[] | null) || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  // Auto-run due recurring invoices on mount
  useEffect(() => {
    if (!recurring.length || !supabase) return
    const today = new Date().toISOString().slice(0, 10)
    const due = recurring.filter((r) => r.active && r.next_run <= today)
    if (due.length === 0) return
    ;(async () => {
      for (const r of due) {
        try {
          await createInvoice(
            {
              client_id: r.client_id,
              project_id: r.project_id,
              status: 'draft',
              issue_date: today,
              tax_rate: Number(r.tax_rate || 0),
            },
            r.items || []
          )
          const next = nextDate(r.next_run, r.frequency)
          await supabase!
            .from('recurring_invoices')
            .update({ next_run: next })
            .eq('id', r.id)
        } catch (err) {
          console.error('recurring failed', err)
        }
      }
      fetch()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring.length])

  const create = async (
    payload: RecurringInvoiceInsert
  ): Promise<RecurringInvoiceWithRelations> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('recurring_invoices')
      .insert({ ...payload, user_id: user.id })
      .select('*, clients(name), projects(name)')
      .single()
    if (error) throw error
    const r = data as RecurringInvoiceWithRelations
    setRecurring((prev) => [r, ...prev])
    return r
  }

  const update = async (
    id: string,
    payload: RecurringInvoiceUpdate
  ): Promise<RecurringInvoiceWithRelations> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('recurring_invoices')
      .update(payload)
      .eq('id', id)
      .select('*, clients(name), projects(name)')
      .single()
    if (error) throw error
    const r = data as RecurringInvoiceWithRelations
    setRecurring((prev) => prev.map((x) => (x.id === id ? r : x)))
    return r
  }

  const remove = async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase
      .from('recurring_invoices')
      .delete()
      .eq('id', id)
    if (error) throw error
    setRecurring((prev) => prev.filter((r) => r.id !== id))
  }

  return { recurring, loading, create, update, remove, fetch }
}
