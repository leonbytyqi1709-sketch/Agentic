import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'

export function useExpenses() {
  const user = useAuthStore((s) => s.user)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*, projects(name), clients(name)')
      .order('date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createExpense = async (payload) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...payload, user_id: user.id })
      .select('*, projects(name), clients(name)')
      .single()
    if (error) throw error
    setExpenses((prev) => [data, ...prev])
    logActivity({ type: 'expense.created', entity_type: 'expense', entity_id: data.id, entity_name: data.description })
    return data
  }

  const updateExpense = async (id, payload) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select('*, projects(name), clients(name)')
      .single()
    if (error) throw error
    setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)))
    return data
  }

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  return { expenses, loading, total, fetch, createExpense, updateExpense, deleteExpense }
}
