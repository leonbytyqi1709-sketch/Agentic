import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Rocket, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '../lib/cn.js'
import type { Client, Profile, ProjectWithClient, InvoiceWithRelations } from '../types'

export interface OnboardingCardProps {
  clients: Client[]
  projects: ProjectWithClient[]
  invoices: InvoiceWithRelations[]
  profile: Profile | null
}

interface OnboardingStep {
  id: string
  label: string
  hint: string
  done: boolean
  to: string
}

export default function OnboardingCard({
  clients,
  projects,
  invoices,
  profile,
}: OnboardingCardProps) {
  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      label: 'Complete your profile',
      hint: 'Add your name, company & hourly rate',
      done: !!profile?.full_name,
      to: '/settings',
    },
    {
      id: 'client',
      label: 'Add your first client',
      hint: 'Start managing relationships',
      done: clients.length > 0,
      to: '/clients',
    },
    {
      id: 'project',
      label: 'Create your first project',
      hint: 'Organize tasks & track time',
      done: projects.length > 0,
      to: '/projects',
    },
    {
      id: 'invoice',
      label: 'Send your first invoice',
      hint: 'Generate PDFs & get paid',
      done: invoices.length > 0,
      to: '/invoices',
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  if (doneCount === steps.length) return null

  // Circular progress math
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-card-lg">
      {/* Gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/25 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/15 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="relative p-7">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-glow-primary">
                <Rocket className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-text leading-tight">
                  Welcome to Client<span className="text-gradient-primary">Pulse</span>
                </h3>
              </div>
            </div>
            <p className="text-sm text-text/55 leading-snug">
              You're{' '}
              <span className="font-semibold text-primary">
                {doneCount} / {steps.length}
              </span>{' '}
              steps away from your first paid invoice
            </p>
          </div>

          {/* Circular progress */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="url(#onboarding-grad)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="onboarding-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="100%" stopColor="#BE123C" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gradient-primary tabular-nums">
                {pct}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map((s) => (
            <Link
              key={s.id}
              to={s.to}
              className={cn(
                'group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
                s.done
                  ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-primary/40 hover:bg-primary/[0.05] hover:-translate-y-[1px]'
              )}
            >
              {s.done ? (
                <div className="w-6 h-6 rounded-full bg-success/15 border border-success/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" strokeWidth={3} />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-white/15 flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors">
                  <Circle className="w-2 h-2 text-white/20" fill="currentColor" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-semibold leading-tight',
                    s.done ? 'text-text/50 line-through' : 'text-text'
                  )}
                >
                  {s.label}
                </div>
                {!s.done && (
                  <div className="text-[11px] text-text/40 leading-tight mt-0.5">
                    {s.hint}
                  </div>
                )}
              </div>
              {!s.done && (
                <ArrowRight className="w-4 h-4 text-text/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              )}
            </Link>
          ))}
        </div>

        {pct > 50 && (
          <div className="mt-5 flex items-center gap-2 text-xs text-text/50">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>
              You're more than halfway there —{' '}
              <span className="text-primary font-semibold">keep going!</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
