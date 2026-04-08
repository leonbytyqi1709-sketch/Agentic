import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import { useAuthStore } from '../store/authStore.js'

export default function Register() {
  const navigate = useNavigate()
  const signUp = useAuthStore((s) => s.signUp)
  const [fullName, setFullName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUp(email, password, fullName)
      navigate('/dashboard')
    } catch (err) {
      setError((err as Error).message || 'Sign up failed')
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
            Create your account
          </h1>
          <p className="text-sm text-text/50 mb-6">
            Start managing clients in minutes
          </p>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              label="Full name"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
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
              minLength={6}
            />
            {error && (
              <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <Button type="submit" className="mt-2 w-full h-11" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </Button>
          </form>
          <p className="text-sm text-text/50 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-accent font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
