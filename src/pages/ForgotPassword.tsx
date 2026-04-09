import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import { supabase } from '../lib/supabase.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) {
      setError('Supabase not configured')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError((err as Error).message || 'Failed to send reset email')
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
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text mb-2">
                Check your inbox
              </h1>
              <p className="text-sm text-text/60 mb-6">
                We sent a password reset link to{' '}
                <span className="text-text font-semibold">{email}</span>. Click the link
                in the email to set a new password.
              </p>
              <Link
                to="/login"
                className="text-sm text-primary hover:text-accent font-medium"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text mb-1">
                Reset password
              </h1>
              <p className="text-sm text-text/50 mb-6">
                Enter your email and we'll send you a reset link.
              </p>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {error && (
                  <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <Button type="submit" className="mt-2 w-full h-11" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
              <p className="text-sm text-text/50 text-center mt-6">
                Remembered it?{' '}
                <Link to="/login" className="text-primary hover:text-accent font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
