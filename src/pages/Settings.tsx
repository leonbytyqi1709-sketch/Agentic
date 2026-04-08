import { useEffect, useState, useRef } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { User, Mail, LogOut, Upload, Building2, Palette } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import { useAuthStore } from '../store/authStore.js'
import { useProfile } from '../hooks/useProfile.js'
import { toast } from '../store/toastStore.js'
import TwoFactor from '../components/TwoFactor.js'

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { profile, updateProfile, uploadAvatar, loading } = useProfile()

  const [fullName, setFullName] = useState<string>('')
  const [company, setCompany] = useState<string>('')
  const [hourlyRate, setHourlyRate] = useState<number | string>('')
  const [currency, setCurrency] = useState<string>('EUR')
  const [address, setAddress] = useState<string>('')
  const [vatId, setVatId] = useState<string>('')
  const [invoiceFooter, setInvoiceFooter] = useState<string>('')
  const [accentColor, setAccentColor] = useState<string>('#E11D48')
  const [saving, setSaving] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setCompany(profile.company || '')
      setHourlyRate(profile.hourly_rate ?? '')
      setCurrency(profile.currency || 'EUR')
      setAddress(profile.address || '')
      setVatId(profile.vat_id || '')
      setInvoiceFooter(profile.invoice_footer || '')
      setAccentColor(profile.invoice_accent_color || '#E11D48')
    }
  }, [profile])

  async function saveProfile(e: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({
        full_name: fullName,
        company,
        hourly_rate: hourlyRate === '' ? null : Number(hourlyRate),
        currency,
        address: address || null,
        vat_id: vatId || null,
        invoice_footer: invoiceFooter || null,
        invoice_accent_color: accentColor,
      })
      toast.success('Profile updated')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadAvatar(file)
      toast.success('Avatar updated')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl flex flex-col gap-6">
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight text-text">Profile</h3>
          </div>

          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
                  {fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload avatar'}
              </Button>
              <p className="text-xs text-text/40 mt-2">PNG or JPG, up to 2MB</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
            <Input
              label="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Studio"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hourly rate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="90"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text/40 font-medium">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-11 bg-white/5 border border-white/10 rounded-lg px-3.5 text-sm text-text focus:border-primary/50 focus:outline-none"
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Email</label>
              <div className="h-11 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3.5 flex items-center gap-2 text-sm text-text/60">
                <Mail className="w-4 h-4 text-text/40" />
                {user?.email}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight text-text">Invoice Branding</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Business address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Street, City, Country"
                className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-primary/50 focus:outline-none resize-none"
              />
            </div>
            <Input label="VAT ID" value={vatId} onChange={(e) => setVatId(e.target.value)} placeholder="DE123456789" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Invoice footer</label>
              <textarea
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                rows={2}
                placeholder="Payment terms, bank details..."
                className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-primary/50 focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-text/40 font-medium">Accent color</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
              <span className="text-xs font-mono text-text/60">{accentColor}</span>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={saveProfile} disabled={saving}>
                Save branding
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-text/60" />
            <h3 className="text-sm font-semibold tracking-tight text-text">Keyboard shortcuts</h3>
          </div>
          <p className="text-xs text-text/40 mb-4">Boost your workflow</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text/70">Open command palette</span>
              <kbd className="text-[11px] text-text/60 border border-white/10 bg-white/[0.03] rounded px-2 py-0.5 font-mono">
                ⌘ K
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text/70">Close dialogs</span>
              <kbd className="text-[11px] text-text/60 border border-white/10 bg-white/[0.03] rounded px-2 py-0.5 font-mono">
                ESC
              </kbd>
            </div>
          </div>
        </div>

        <TwoFactor />

        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-6">
          <h3 className="text-sm font-semibold tracking-tight text-text mb-1">Account</h3>
          <p className="text-xs text-text/40 mb-5">Sign out of your ClientPulse account</p>
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 h-9 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
