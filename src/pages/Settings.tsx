import { useEffect, useState, useRef } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent, ComponentType } from 'react'
import {
  User,
  Mail,
  LogOut,
  Upload,
  Palette,
  Shield,
  Keyboard,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import Modal from '../components/ui/Modal.js'
import { useAuthStore } from '../store/authStore.js'
import { useProfile } from '../hooks/useProfile.js'
import { toast } from '../store/toastStore.js'
import TwoFactor from '../components/TwoFactor.js'
import { cn } from '../lib/cn.js'

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>

type SettingsTabId = 'profile' | 'branding' | 'security' | 'shortcuts' | 'account'

interface SettingsTab {
  id: SettingsTabId
  label: string
  description: string
  icon: IconComponent
}

const TABS: SettingsTab[] = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your personal info & billing rate',
    icon: User,
  },
  {
    id: 'branding',
    label: 'Invoice Branding',
    description: 'Address, VAT, footer & colors',
    icon: Palette,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Two-factor authentication',
    icon: Shield,
  },
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    description: 'Keyboard workflows',
    icon: Keyboard,
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Sign out or delete account',
    icon: AlertTriangle,
  },
]

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { profile, updateProfile, uploadAvatar, loading } = useProfile()

  const [tab, setTab] = useState<SettingsTabId>('profile')

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
  const [resetOpen, setResetOpen] = useState<boolean>(false)
  const [resetting, setResetting] = useState<boolean>(false)
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

  async function saveProfile(
    e: FormEvent<HTMLFormElement> | ReactMouseEvent<HTMLButtonElement>
  ) {
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

  async function handleReset() {
    setResetting(true)
    try {
      await updateProfile({
        full_name: null,
        company: null,
        hourly_rate: null,
        currency: 'EUR',
        address: null,
        vat_id: null,
        invoice_footer: null,
        invoice_accent_color: '#E11D48',
      })
      // Reset local form state too
      setFullName('')
      setCompany('')
      setHourlyRate('')
      setCurrency('EUR')
      setAddress('')
      setVatId('')
      setInvoiceFooter('')
      setAccentColor('#E11D48')
      toast.success('Einstellungen zurückgesetzt')
      setResetOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setResetting(false)
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

  const displayName =
    profile?.full_name ||
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    user?.email?.split('@')[0] ||
    'Account'
  const initial = (displayName.charAt(0) || '?').toUpperCase()

  return (
    <AppLayout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* ═════════════════ LEFT: TAB NAV ═════════════════ */}
        <aside className="flex flex-col gap-4">
          {/* User header card */}
          <div className="card p-5 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center gap-3 mb-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/10 shadow-lg"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-base font-bold shadow-glow-primary">
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text truncate leading-tight">
                  {displayName}
                </div>
                <div className="text-[11px] text-text/40 truncate leading-tight mt-0.5">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>

          {/* Tab list */}
          <nav className="flex flex-col gap-1">
            {TABS.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'group relative flex items-start gap-3 px-3 py-3 rounded-xl border text-left transition-all duration-150',
                  tab === id
                    ? 'bg-primary/[0.08] border-primary/25 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.1)]'
                    : 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]'
                )}
              >
                {/* Active indicator */}
                {tab === id && (
                  <span className="absolute left-0 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary to-primary-dark rounded-r-full" />
                )}
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all',
                    tab === id
                      ? 'bg-primary/15 text-primary border border-primary/25'
                      : 'bg-white/[0.04] text-text/50 border border-white/[0.08] group-hover:text-text/80'
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-sm font-semibold leading-tight',
                      tab === id ? 'text-text' : 'text-text/80'
                    )}
                  >
                    {label}
                  </div>
                  <div className="text-[11px] text-text/40 mt-0.5 leading-tight">
                    {description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* ═════════════════ RIGHT: CONTENT ═════════════════ */}
        <div className="min-w-0">
          {tab === 'profile' && (
            <div className="card p-8 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-text">Profile</h2>
                </div>
                <p className="text-sm text-text/50 ml-10 mb-8">
                  Update your personal information, billing rate and currency.
                </p>

                {/* Avatar row */}
                <div className="flex items-center gap-5 mb-8 pb-8 border-b border-white/[0.04]">
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-white/10 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-bold shadow-glow-primary">
                        {initial}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-text mb-1">
                      Profile photo
                    </div>
                    <p className="text-xs text-text/40 mb-3">PNG or JPG, up to 2 MB</p>
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
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      loading={uploading}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? 'Uploading...' : 'Upload new'}
                    </Button>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Hourly rate"
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="90"
                      hint="Used for the 'Invoice time' quick action"
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-text/50 font-semibold uppercase tracking-wider">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="h-11 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3.5 text-sm text-text focus:border-primary/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(225,29,72,0.12)] focus:outline-none transition-all"
                      >
                        <option value="EUR">EUR €</option>
                        <option value="USD">USD $</option>
                        <option value="GBP">GBP £</option>
                        <option value="CHF">CHF</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-text/50 font-semibold uppercase tracking-wider">
                      Email
                    </label>
                    <div className="h-11 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3.5 flex items-center gap-2 text-sm text-text/60">
                      <Mail className="w-4 h-4 text-text/40" />
                      {user?.email}
                      <span className="ml-auto text-[10px] text-text/30 uppercase tracking-wider">
                        Read-only
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-white/[0.04]">
                    <Button type="submit" loading={saving} disabled={loading}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {tab === 'branding' && (
            <div className="card p-8 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-text">
                    Invoice Branding
                  </h2>
                </div>
                <p className="text-sm text-text/50 ml-10 mb-8">
                  These details appear on every generated PDF and public share link.
                </p>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-text/50 font-semibold uppercase tracking-wider">
                      Business address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      placeholder="Street, City, Country"
                      className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3.5 py-3 text-sm text-text placeholder:text-text/25 focus:border-primary/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(225,29,72,0.12)] focus:outline-none resize-none transition-all"
                    />
                  </div>

                  <Input
                    label="VAT ID"
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value)}
                    placeholder="DE123456789"
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-text/50 font-semibold uppercase tracking-wider">
                      Invoice footer
                    </label>
                    <textarea
                      value={invoiceFooter}
                      onChange={(e) => setInvoiceFooter(e.target.value)}
                      rows={3}
                      placeholder="Payment terms, bank details..."
                      className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3.5 py-3 text-sm text-text placeholder:text-text/25 focus:border-primary/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(225,29,72,0.12)] focus:outline-none resize-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] text-text/50 font-semibold uppercase tracking-wider">
                      Accent color
                    </label>
                    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                      <div
                        className="w-12 h-12 rounded-lg shadow-lg relative overflow-hidden"
                        style={{ backgroundColor: accentColor }}
                      >
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-text">
                          Click to change
                        </div>
                        <div className="text-[11px] font-mono text-text/50 uppercase">
                          {accentColor}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-white/[0.04]">
                    <Button type="button" onClick={saveProfile} loading={saving}>
                      {saving ? 'Saving...' : 'Save branding'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && <TwoFactor />}

          {tab === 'shortcuts' && (
            <div className="card p-8 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-info/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center">
                    <Keyboard className="w-4 h-4 text-info" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-text">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <p className="text-sm text-text/50 ml-10 mb-8">
                  Master these to work at the speed of thought.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { keys: ['⌘', 'K'], label: 'Open command palette' },
                    { keys: ['ESC'], label: 'Close dialogs & modals' },
                    { keys: ['G', 'D'], label: 'Go to Dashboard' },
                    { keys: ['G', 'C'], label: 'Go to Clients' },
                    { keys: ['G', 'P'], label: 'Go to Projects' },
                    { keys: ['G', 'I'], label: 'Go to Invoices' },
                    { keys: ['G', 'R'], label: 'Go to Reports' },
                    { keys: ['G', 'S'], label: 'Go to Settings' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                    >
                      <span className="text-sm text-text/80 font-medium">{s.label}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k) => (
                          <kbd
                            key={k}
                            className="text-[11px] text-text/80 border border-white/10 bg-white/[0.04] rounded px-1.5 py-0.5 font-mono font-semibold shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="card p-8 relative overflow-hidden border-danger/20">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-danger/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-danger-bg border border-danger/25 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-danger" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-text">Account</h2>
                </div>
                <p className="text-sm text-text/50 ml-10 mb-8">
                  Manage your session and account access.
                </p>

                <div className="flex flex-col gap-4">
                  {/* Reset Settings */}
                  <div className="bg-warning-bg border border-warning/20 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <RotateCcw className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-text leading-tight">
                          Einstellungen zurücksetzen
                        </div>
                        <p className="text-xs text-text/60 mt-1 leading-snug">
                          Setzt Profil, Hourly-Rate, Branding-Details und Akzentfarbe
                          auf die Standardwerte zurück. Deine Clients, Projekte und
                          Rechnungen bleiben unberührt.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetOpen(true)}
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold bg-warning/10 border border-warning/30 text-warning hover:bg-warning/20 hover:border-warning/50 active:scale-[0.97] transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Zurücksetzen
                    </button>
                  </div>

                  {/* Sign out */}
                  <div className="bg-danger-bg border border-danger/20 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <LogOut className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-text leading-tight">
                          Sign out
                        </div>
                        <p className="text-xs text-text/60 mt-1 leading-snug">
                          You'll need to sign in again to access your workspace.
                          All your data stays safe.
                        </p>
                      </div>
                    </div>
                    <Button variant="danger" size="sm" onClick={signOut}>
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out of ClientPulse
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset confirmation modal */}
      <Modal
        open={resetOpen}
        onClose={() => !resetting && setResetOpen(false)}
        title="Einstellungen wirklich zurücksetzen?"
      >
        <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-warning-bg border border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-text/70 leading-snug">
            Dein <span className="font-semibold text-text">Name</span>,{' '}
            <span className="font-semibold text-text">Firma</span>,{' '}
            <span className="font-semibold text-text">Hourly Rate</span>,{' '}
            <span className="font-semibold text-text">Adresse</span>,{' '}
            <span className="font-semibold text-text">VAT-ID</span>,{' '}
            <span className="font-semibold text-text">Invoice Footer</span> und die{' '}
            <span className="font-semibold text-text">Accent-Farbe</span> werden
            auf die Standardwerte zurückgesetzt.
          </p>
        </div>
        <p className="text-xs text-text/50 mb-5">
          Dein Avatar, deine Clients, Projekte und Rechnungen sind davon{' '}
          <span className="text-success font-semibold">nicht</span> betroffen.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setResetOpen(false)}
            disabled={resetting}
          >
            Abbrechen
          </Button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            style={{ backgroundColor: '#F59E0B', color: '#080808' }}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:brightness-110 hover:-translate-y-[1px] active:scale-[0.97] disabled:opacity-50 disabled:translate-y-0 transition-all"
          >
            <RotateCcw className={cn('w-3.5 h-3.5', resetting && 'animate-spin')} />
            {resetting ? 'Setze zurück...' : 'Ja, zurücksetzen'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
