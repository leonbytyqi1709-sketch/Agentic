import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { logActivity } from '../lib/activity.js'

export function useClients() {
  const user = useAuthStore((s) => s.user)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClients = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setClients(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createClient = async (payload) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setClients((prev) => [data, ...prev])
    logActivity({
      type: 'client.created',
      entity_type: 'client',
      entity_id: data.id,
      entity_name: data.name,
    })
    return data
  }

  const updateClient = async (id, payload) => {
    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setClients((prev) => prev.map((c) => (c.id === id ? data : c)))
    logActivity({
      type: 'client.updated',
      entity_type: 'client',
      entity_id: data.id,
      entity_name: data.name,
    })
    return data
  }

  const deleteClient = async (id) => {
    const c = clients.find((x) => x.id === id)
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
    setClients((prev) => prev.filter((x) => x.id !== id))
    if (c) {
      logActivity({
        type: 'client.deleted',
        entity_type: 'client',
        entity_id: id,
        entity_name: c.name,
      })
    }
  }

  return { clients, loading, error, fetchClients, createClient, updateClient, deleteClient }
}
