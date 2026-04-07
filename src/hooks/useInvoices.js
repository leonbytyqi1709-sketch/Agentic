import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'

export function useInvoices() {
  const user = useAuthStore((s) => s.user)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInvoices = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(name, company), projects(name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      // Auto-mark overdue invoices
      const today = new Date().toISOString().slice(0, 10)
      const toOverdue = (data || []).filter(
        (i) => i.status === 'sent' && i.due_date && i.due_date < today
      )
      if (toOverdue.length > 0) {
        await Promise.all(
          toOverdue.map((i) =>
            supabase.from('invoices').update({ status: 'overdue' }).eq('id', i.id)
          )
        )
        setInvoices(
          (data || []).map((i) =>
            toOverdue.find((x) => x.id === i.id) ? { ...i, status: 'overdue' } : i
          )
        )
      } else {
        setInvoices(data || [])
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    return `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`
  }

  const createInvoice = async (payload, items = []) => {
    const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)
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

    if (items.length) {
      const toInsert = items.map((it, i) => ({
        invoice_id: inv.id,
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
      entity_id: inv.id,
      entity_name: inv.number,
      metadata: { total: inv.total },
    })

    await fetchInvoices()
    return inv
  }

  const updateInvoice = async (id, payload, items) => {
    let update = { ...payload }
    if (items) {
      const subtotal = items.reduce(
        (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
        0
      )
      const taxRate = Number(payload.tax_rate ?? 0)
      const taxAmount = (subtotal * taxRate) / 100
      update = { ...update, subtotal, tax_amount: taxAmount, total: subtotal + taxAmount }
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

    setInvoices((prev) => prev.map((i) => (i.id === id ? data : i)))
    return data
  }

  const deleteInvoice = async (id) => {
    const inv = invoices.find((i) => i.id === id)
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw error
    setInvoices((prev) => prev.filter((i) => i.id !== id))
    if (inv) {
      logActivity({
        type: 'invoice.deleted',
        entity_type: 'invoice',
        entity_id: id,
        entity_name: inv.number,
      })
    }
  }

  const fetchInvoiceWithItems = async (id) => {
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
    return { invoice: inv, items: items || [] }
  }

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    fetchInvoiceWithItems,
    generateInvoiceNumber,
  }
}
