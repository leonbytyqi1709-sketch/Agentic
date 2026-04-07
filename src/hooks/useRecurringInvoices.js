import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { useInvoices } from './useInvoices.js'

function nextDate(date, frequency) {
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

export function useRecurringInvoices() {
  const user = useAuthStore((s) => s.user)
  const { createInvoice } = useInvoices()
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('recurring_invoices')
      .select('*, clients(name), projects(name)')
      .order('next_run', { ascending: true })
    setRecurring(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  // Auto-run due recurring invoices on mount
  useEffect(() => {
    if (!recurring.length) return
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
          await supabase
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

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('recurring_invoices')
      .insert({ ...payload, user_id: user.id })
      .select('*, clients(name), projects(name)')
      .single()
    if (error) throw error
    setRecurring((prev) => [data, ...prev])
    return data
  }

  const update = async (id, payload) => {
    const { data, error } = await supabase
      .from('recurring_invoices')
      .update(payload)
      .eq('id', id)
      .select('*, clients(name), projects(name)')
      .single()
    if (error) throw error
    setRecurring((prev) => prev.map((r) => (r.id === id ? data : r)))
    return data
  }

  const remove = async (id) => {
    const { error } = await supabase.from('recurring_invoices').delete().eq('id', id)
    if (error) throw error
    setRecurring((prev) => prev.filter((r) => r.id !== id))
  }

  return { recurring, loading, create, update, remove, fetch }
}
