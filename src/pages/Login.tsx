import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import { useAuthStore } from '../store/authStore.js'

export default function Login() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError((err as Error).message || 'Sign in failed')
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
          <span className="text-xl font-bold tracking-tight text-text">
            ClientPulse
          </span>
        </div>
        <div className="bg-surface-2 rounded-2xl border border-white/[0.06] shadow-card p-8 w-full">
          <h1 className="text-2xl font-bold tracking-tight text-text mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-text/50 mb-6">
            Sign in to continue to your workspace
          </p>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs text-text/50 hover:text-primary font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="mt-2 w-full h-11" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="text-sm text-text/50 text-center mt-6">
            No account?{' '}
            <Link to="/register" className="text-primary hover:text-accent font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
