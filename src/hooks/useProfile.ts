import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import type { Profile, ProfileUpdate } from '../types'

export interface UseProfileResult {
  profile: Profile | null
  loading: boolean
  updateProfile: (payload: ProfileUpdate) => Promise<Profile>
  uploadAvatar: (file: File | null) => Promise<string | null>
  refetch: () => Promise<void>
}

export function useProfile(): UseProfileResult {
  const user = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<Profile | null>(null)
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
      setProfile((created as Profile | null) ?? null)
    } else {
      setProfile(data as Profile)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  const updateProfile = async (payload: ProfileUpdate): Promise<Profile> => {
    if (!supabase || !user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    const p = data as Profile
    setProfile(p)
    return p
  }

  const uploadAvatar = async (file: File | null): Promise<string | null> => {
    if (!file) return null
    if (!supabase || !user) throw new Error('Not authenticated')
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
