import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'

export function useAttachments(entityType, entityId) {
  const user = useAuthStore((s) => s.user)
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user || !entityId) return
    setLoading(true)
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
    setAttachments(data || [])
    setLoading(false)
  }, [user, entityType, entityId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const upload = async (file) => {
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('attachments')
      .upload(path, file)
    if (upErr) throw upErr
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()
    if (error) throw error
    setAttachments((prev) => [data, ...prev])
    return data
  }

  const remove = async (attachment) => {
    await supabase.storage.from('attachments').remove([attachment.file_path])
    const { error } = await supabase.from('attachments').delete().eq('id', attachment.id)
    if (error) throw error
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
  }

  const getSignedUrl = async (attachment) => {
    const { data } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.file_path, 3600)
    return data?.signedUrl
  }

  return { attachments, loading, upload, remove, getSignedUrl }
}
