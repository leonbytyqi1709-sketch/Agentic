import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'
import type {
  Quote,
  QuoteInsert,
  QuoteItem,
  QuoteItemInsert,
  QuoteUpdate,
  QuoteWithRelations,
} from '../types'

export interface UseQuotesResult {
  quotes: QuoteWithRelations[]
  loading: boolean
  fetch: () => Promise<void>
  createQuote: (
    payload: QuoteInsert,
    items: QuoteItemInsert[]
  ) => Promise<QuoteWithRelations>
  updateQuote: (
    id: string,
    payload: QuoteUpdate,
    items?: QuoteItemInsert[]
  ) => Promise<QuoteWithRelations>
  deleteQuote: (id: string) => Promise<void>
  getQuote: (id: string) => Promise<{ quote: QuoteWithRelations; items: QuoteItem[] }>
}

export function useQuotes(): UseQuotesResult {
  const user = useAuthStore((s) => s.user)
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('*, clients(name, company, email), projects(name)')
      .order('created_at', { ascending: false })
    setQuotes((data as unknown as QuoteWithRelations[] | null) || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createQuote = useCallback(
    async (
      payload: QuoteInsert,
      items: QuoteItemInsert[]
    ): Promise<QuoteWithRelations> => {
      if (!supabase || !user) throw new Error('Not authenticated')
      // Generate number via RPC
      let number = payload.number
      if (!number) {
        const { data: num } = await supabase.rpc('next_quote_number', {
          p_user_id: user.id,
        })
        number = (num as string) || `Q-${Date.now()}`
      }
      // Calculate totals
      const subtotal = items.reduce(
        (s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0),
        0
      )
      const taxRate = Number(payload.tax_rate ?? 19)
      const taxAmount = +(subtotal * (taxRate / 100)).toFixed(2)
      const total = +(subtotal + taxAmount).toFixed(2)

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          ...payload,
          number,
          user_id: user.id,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
        })
        .select('*, clients(name, company, email), projects(name)')
        .single()
      if (error) throw error
      const quote = data as unknown as QuoteWithRelations

      if (items.length > 0) {
        const itemsPayload = items.map((it, idx) => ({
          quote_id: quote.id,
          description: it.description,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          amount: Number(it.quantity || 0) * Number(it.unit_price || 0),
          position: idx,
        }))
        await supabase.from('quote_items').insert(itemsPayload)
      }

      setQuotes((prev) => [quote, ...prev])
      logActivity({
        type: 'invoice.created',
        entity_type: 'invoice',
        entity_id: quote.id,
        entity_name: `Quote ${quote.number}`,
      })
      return quote
    },
    [user]
  )

  const updateQuote = useCallback(
    async (
      id: string,
      payload: QuoteUpdate,
      items?: QuoteItemInsert[]
    ): Promise<QuoteWithRelations> => {
      if (!supabase) throw new Error('Supabase not configured')
      let update: QuoteUpdate = { ...payload }
      if (items) {
        const subtotal = items.reduce(
          (s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0),
          0
        )
        const taxRate = Number(payload.tax_rate ?? update.tax_rate ?? 19)
        const taxAmount = +(subtotal * (taxRate / 100)).toFixed(2)
        const total = +(subtotal + taxAmount).toFixed(2)
        update = { ...update, subtotal, tax_rate: taxRate, tax_amount: taxAmount, total }
      }
      const { data, error } = await supabase
        .from('quotes')
        .update(update)
        .eq('id', id)
        .select('*, clients(name, company, email), projects(name)')
        .single()
      if (error) throw error
      const quote = data as unknown as QuoteWithRelations

      if (items) {
        await supabase.from('quote_items').delete().eq('quote_id', id)
        if (items.length > 0) {
          await supabase.from('quote_items').insert(
            items.map((it, idx) => ({
              quote_id: id,
              description: it.description,
              quantity: Number(it.quantity || 0),
              unit_price: Number(it.unit_price || 0),
              amount: Number(it.quantity || 0) * Number(it.unit_price || 0),
              position: idx,
            }))
          )
        }
      }

      setQuotes((prev) => prev.map((q) => (q.id === id ? quote : q)))
      return quote
    },
    []
  )

  const deleteQuote = useCallback(async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) throw error
    setQuotes((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const getQuote = useCallback(
    async (id: string): Promise<{ quote: QuoteWithRelations; items: QuoteItem[] }> => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*, clients(name, company, email), projects(name)')
        .eq('id', id)
        .single()
      if (error) throw error
      const { data: items } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', id)
        .order('position', { ascending: true })
      return {
        quote: quote as unknown as QuoteWithRelations,
        items: (items as QuoteItem[] | null) || [],
      }
    },
    []
  )

  return { quotes, loading, fetch, createQuote, updateQuote, deleteQuote, getQuote }
}
