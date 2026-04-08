import { useEffect, useState } from 'react'
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react'
import Button from './ui/Button.js'
import Input from './ui/Input.js'
import { supabase } from '../lib/supabase.js'
import { toast } from '../store/toastStore.js'

interface TotpFactor {
  id: string
  status: 'verified' | 'unverified' | string
  created_at: string
}

export default function TwoFactor() {
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [enrolling, setEnrolling] = useState<boolean>(false)
  const [qr, setQr] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState<string>('')
  const [verifying, setVerifying] = useState<boolean>(false)

  async function load() {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp as TotpFactor[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function startEnroll() {
    if (!supabase) return
    setEnrolling(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error
      setQr(data.totp.qr_code)
      setFactorId(data.id)
    } catch (err) {
      toast.error((err as Error).message)
      setEnrolling(false)
    }
  }

  async function verify() {
    if (!supabase || !factorId) return
    setVerifying(true)
    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId })
      if (ce) throw ce
      const { error: ve } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (ve) throw ve
      toast.success('2FA activated')
      setEnrolling(false)
      setQr(null)
      setCode('')
      setFactorId(null)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setVerifying(false)
    }
  }

  async function unenroll(id: string) {
    if (!supabase) return
    if (!confirm('Disable 2FA?')) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('2FA disabled')
    load()
  }

  const verified = factors.filter((f) => f.status === 'verified')

  return (
    <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-6">
      <div className="flex items-center gap-2 mb-1">
        {verified.length > 0 ? (
          <ShieldCheck className="w-4 h-4 text-green-400" />
        ) : (
          <Shield className="w-4 h-4 text-text/60" />
        )}
        <h3 className="text-sm font-semibold tracking-tight text-text">
          Two-Factor Authentication
        </h3>
      </div>
      <p className="text-xs text-text/40 mb-5">
        Secure your account with a TOTP app (Google Authenticator, 1Password, Authy)
      </p>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : verified.length > 0 ? (
        <div className="flex flex-col gap-3">
          {verified.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-text">TOTP Active</div>
                  <div className="text-xs text-text/40">
                    Added {new Date(f.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => unenroll(f.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                Disable
              </button>
            </div>
          ))}
        </div>
      ) : enrolling && qr ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <img src={qr} alt="QR code" className="w-40 h-40 bg-white rounded-lg p-2" />
            <div className="flex-1 text-xs text-text/60 space-y-2">
              <p>1. Scan this QR with your authenticator app</p>
              <p>2. Enter the 6-digit code below</p>
              <p>3. Click verify</p>
            </div>
          </div>
          <Input
            label="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setEnrolling(false)
                setQr(null)
                setCode('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={verify} disabled={verifying || code.length !== 6}>
              {verifying ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={startEnroll} disabled={enrolling}>
          <Shield className="w-4 h-4" />
          Enable 2FA
        </Button>
      )}
    </div>
  )
}
