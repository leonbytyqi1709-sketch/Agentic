import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { Attachment, AttachmentEntityType } from '../types'

export interface UseAttachmentsResult {
  attachments: Attachment[]
  loading: boolean
  upload: (file: File) => Promise<Attachment>
  remove: (attachment: Attachment) => Promise<void>
  getSignedUrl: (attachment: Attachment) => Promise<string | undefined>
}

export function useAttachments(
  entityType: AttachmentEntityType,
  entityId: string | undefined
): UseAttachmentsResult {
  const user = useAuthStore((s) => s.user)
  const [attachments, setAttachments] = useState<Attachment[]>([])
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
    setAttachments((data as Attachment[] | null) || [])
    setLoading(false)
  }, [user, entityType, entityId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const upload = async (file: File): Promise<Attachment> => {
    if (!supabase || !user || !entityId) throw new Error('Not ready')
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${entityType}/${entityId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`
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
    const attachment = data as Attachment
    setAttachments((prev) => [attachment, ...prev])
    return attachment
  }

  const remove = async (attachment: Attachment): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    await supabase.storage.from('attachments').remove([attachment.file_path])
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachment.id)
    if (error) throw error
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
  }

  const getSignedUrl = async (
    attachment: Attachment
  ): Promise<string | undefined> => {
    if (!supabase) return undefined
    const { data } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.file_path, 3600)
    return data?.signedUrl
  }

  return { attachments, loading, upload, remove, getSignedUrl }
}
