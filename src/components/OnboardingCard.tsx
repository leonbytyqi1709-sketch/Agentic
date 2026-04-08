import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Rocket, ArrowRight } from 'lucide-react'
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
    { id: 'profile', label: 'Complete your profile', done: !!profile?.full_name, to: '/settings' },
    { id: 'client', label: 'Add your first client', done: clients.length > 0, to: '/clients' },
    { id: 'project', label: 'Create your first project', done: projects.length > 0, to: '/projects' },
    { id: 'invoice', label: 'Send your first invoice', done: invoices.length > 0, to: '/invoices' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  if (doneCount === steps.length) return null

  return (
    <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6 shadow-card">
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold tracking-tight text-text">Welcome to ClientPulse</h3>
          </div>
          <p className="text-xs text-text/50">
            Get started in 4 steps · {doneCount}/{steps.length} done
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{pct}%</div>
        </div>
      </div>
      <div className="h-1 rounded-full bg-white/5 mb-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-col gap-2">
        {steps.map((s) => (
          <Link
            key={s.id}
            to={s.to}
            className={cn(
              'group flex items-center gap-3 px-3 h-10 rounded-lg border transition-colors',
              s.done
                ? 'bg-white/[0.02] border-white/[0.04] text-text/40'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-primary/40 text-text'
            )}
          >
            {s.done ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Circle className="w-4 h-4 text-text/40" />
            )}
            <span className={cn('text-sm flex-1', s.done && 'line-through')}>{s.label}</span>
            {!s.done && (
              <ArrowRight className="w-3.5 h-3.5 text-text/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
