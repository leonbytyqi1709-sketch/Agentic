import { create } from 'zustand'
import {
  requestAccessToken,
  getProfile,
  revokeAccessToken,
} from '../lib/gmail.js'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from './authStore.js'

interface GmailState {
  token: string | null
  /** Expiry timestamp (ms) */
  expiresAt: number | null
  email: string | null
  connecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  /** Returns a valid token, re-consenting if expired or missing. */
  ensureToken: () => Promise<string>
  /** Load persisted connection info (email) from Supabase */
  hydrate: () => Promise<void>
}

const TOKEN_KEY = 'cp-gmail-token'

interface StoredToken {
  token: string
  expiresAt: number
  email: string
}

function loadStored(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    if (!parsed.token || !parsed.expiresAt) return null
    if (Date.now() > parsed.expiresAt - 30_000) return null
    return parsed
  } catch {
    return null
  }
}

function storeToken(t: StoredToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
}

function clearStored() {
  localStorage.removeItem(TOKEN_KEY)
}

export const useGmailStore = create<GmailState>()((set, get) => ({
  token: null,
  expiresAt: null,
  email: null,
  connecting: false,
  error: null,

  hydrate: async () => {
    const stored = loadStored()
    if (stored) {
      set({
        token: stored.token,
        expiresAt: stored.expiresAt,
        email: stored.email,
      })
    }
    const user = useAuthStore.getState().user
    if (!supabase || !user) return
    const { data } = await supabase
      .from('gmail_connections')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data?.email) {
      set((s) => ({ email: s.email || data.email }))
    }
  },

  connect: async () => {
    set({ connecting: true, error: null })
    try {
      const token = await requestAccessToken('consent')
      const profile = await getProfile(token)
      const expiresAt = Date.now() + 55 * 60 * 1000 // ~55min safety
      set({ token, email: profile.emailAddress, expiresAt, connecting: false })
      storeToken({ token, expiresAt, email: profile.emailAddress })
      // Persist connection info
      const user = useAuthStore.getState().user
      if (supabase && user) {
        await supabase.from('gmail_connections').upsert({
          user_id: user.id,
          email: profile.emailAddress,
        })
      }
    } catch (e) {
      set({ connecting: false, error: (e as Error).message })
      throw e
    }
  },

  disconnect: async () => {
    const { token } = get()
    if (token) await revokeAccessToken(token)
    clearStored()
    set({ token: null, expiresAt: null, email: null, error: null })
    const user = useAuthStore.getState().user
    if (supabase && user) {
      await supabase.from('gmail_connections').delete().eq('user_id', user.id)
    }
  },

  ensureToken: async () => {
    const { token, expiresAt } = get()
    if (token && expiresAt && Date.now() < expiresAt - 30_000) return token
    // Silent re-request (user must have interacted at least once already)
    const newToken = await requestAccessToken('')
    const profile = await getProfile(newToken)
    const newExpiresAt = Date.now() + 55 * 60 * 1000
    set({ token: newToken, email: profile.emailAddress, expiresAt: newExpiresAt })
    storeToken({ token: newToken, expiresAt: newExpiresAt, email: profile.emailAddress })
    return newToken
  },
}))
