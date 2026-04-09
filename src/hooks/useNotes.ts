import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/authStore.js'
import { useRealtimeSync } from './useRealtimeSync.js'
import type { Note, NoteInsert, NoteUpdate } from '../types'

export interface UseNotesResult {
  notes: Note[]
  loading: boolean
  fetch: () => Promise<void>
  createNote: (payload?: NoteInsert) => Promise<Note>
  updateNote: (id: string, payload: NoteUpdate) => Promise<Note>
  deleteNote: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
}

export function useNotes(): UseNotesResult {
  const user = useAuthStore((s) => s.user)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes((data as Note[] | null) || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  useRealtimeSync('notes', fetch)

  const createNote = useCallback(
    async (payload: NoteInsert = {}): Promise<Note> => {
      if (!supabase || !user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: payload.title ?? '',
          content: payload.content ?? '',
          pinned: payload.pinned ?? false,
          color: payload.color ?? 'primary',
        })
        .select()
        .single()
      if (error) throw error
      const note = data as Note
      setNotes((prev) => [note, ...prev])
      return note
    },
    [user]
  )

  const updateNote = useCallback(
    async (id: string, payload: NoteUpdate): Promise<Note> => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data, error } = await supabase
        .from('notes')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const note = data as Note
      setNotes((prev) =>
        prev
          .map((n) => (n.id === id ? note : n))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          })
      )
      return note
    },
    []
  )

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const togglePin = useCallback(
    async (id: string): Promise<void> => {
      const note = notes.find((n) => n.id === id)
      if (!note) return
      await updateNote(id, { pinned: !note.pinned })
    },
    [notes, updateNote]
  )

  return { notes, loading, fetch, createNote, updateNote, deleteNote, togglePin }
}
