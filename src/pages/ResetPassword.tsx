import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import { supabase } from '../lib/supabase.js'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase sets a recovery session automatically when the user lands
  // here via the email link. We wait for auth state to confirm.
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    // Also check immediately
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (!supabase) {
      setError('Supabase not configured')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      setError((err as Error).message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/agentic-logo.png"
            alt="ClientPulse"
            className="w-32 h-32 drop-shadow-[0_0_48px_rgba(225,29,72,0.85)]"
          />
          <span className="text-xl font-bold tracking-tight text-text">ClientPulse</span>
        </div>
        <div className="bg-surface-2 rounded-2xl border border-white/[0.06] shadow-card p-8 w-full">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text mb-2">
                Password updated
              </h1>
              <p className="text-sm text-text/60">Redirecting to dashboard…</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text mb-1">
                Set a new password
              </h1>
              <p className="text-sm text-text/50 mb-6">
                {ready
                  ? 'Enter your new password below.'
                  : 'Waiting for the recovery link to validate…'}
              </p>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <Input
                  label="New password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!ready}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={!ready}
                />
                {error && (
                  <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="mt-2 w-full h-11"
                  disabled={loading || !ready}
                >
                  {loading ? 'Updating...' : 'Update password'}
                </Button>
              </form>
              <p className="text-sm text-text/50 text-center mt-6">
                <Link to="/login" className="text-primary hover:text-accent font-medium">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
