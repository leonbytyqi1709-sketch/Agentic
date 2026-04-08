import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'
import type { ExpenseInsert, ExpenseUpdate, ExpenseWithRelations } from '../types'

export interface UseExpensesResult {
  expenses: ExpenseWithRelations[]
  loading: boolean
  total: number
  fetch: () => Promise<void>
  createExpense: (payload: ExpenseInsert) => Promise<ExpenseWithRelations>
  updateExpense: (id: string, payload: ExpenseUpdate) => Promise<ExpenseWithRelations>
  deleteExpense: (id: string) => Promise<void>
}

export function useExpenses(): UseExpensesResult {
  const user = useAuthStore((s) => s.user)
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*, projects(name), clients(name)')
      .order('date', { ascending: false })
    setExpenses((data as ExpenseWithRelations[] | null) || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createExpense = async (
    payload: ExpenseInsert
  ): Promise<ExpenseWithRelations> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...payload, user_id: user.id })
      .select('*, projects(name), clients(name)')
      .single()
    if (error) throw error
    const expense = data as ExpenseWithRelations
    setExpenses((prev) => [expense, ...prev])
    logActivity({
      type: 'expense.created',
      entity_type: 'expense',
      entity_id: expense.id,
      entity_name: expense.description,
    })
    return expense
  }

  const updateExpense = async (
    id: string,
    payload: ExpenseUpdate
  ): Promise<ExpenseWithRelations> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select('*, projects(name), clients(name)')
      .single()
    if (error) throw error
    const expense = data as ExpenseWithRelations
    setExpenses((prev) => prev.map((e) => (e.id === id ? expense : e)))
    return expense
  }

  const deleteExpense = async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  return { expenses, loading, total, fetch, createExpense, updateExpense, deleteExpense }
}
