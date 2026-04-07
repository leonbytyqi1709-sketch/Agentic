import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'

export function useProfile() {
  const user = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (!data) {
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: user.user_metadata?.full_name })
        .select()
        .single()
      setProfile(created)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const updateProfile = async (payload) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  const uploadAvatar = async (file) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '0' })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${data.publicUrl}?t=${Date.now()}`
    await updateProfile({ avatar_url: url })
    return url
  }

  return { profile, loading, updateProfile, uploadAvatar, refetch: fetch }
}
