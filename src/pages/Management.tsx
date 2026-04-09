import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  Users,
  FolderKanban,
  CircleDollarSign,
  Clock,
  CheckSquare,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useTimeEntries } from '../hooks/useTimeEntries.js'
import { useTasks } from '../hooks/useTasks.js'

type IconComponent = ComponentType<{ className?: string }>

interface StatCardProps {
  icon: IconComponent
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

function StatCard({ icon: Icon, label, value, sub, accent = false }: StatCardProps) {
  return (
    <div className="card card-hover p-6 relative overflow-hidden group">
      {accent && (
        <div className="absolute inset-0 bg-gradient-primary-soft opacity-60 pointer-events-none" />
      )}
      <div
        className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 ${
          accent
            ? 'bg-primary/20 opacity-100'
            : 'bg-white/[0.04] opacity-60 group-hover:opacity-100'
        }`}
      />
      <div className="relative flex items-start justify-between mb-5">
        <span className="text-[10px] text-text/40 font-semibold uppercase tracking-widest">
          {label}
        </span>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
            accent
              ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-glow-primary'
              : 'bg-white/[0.04] border border-white/[0.08] text-text/70'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative text-4xl font-bold tracking-tight text-text leading-none">
        {value}
      </div>
      {sub && (
        <div className="relative text-xs text-text/45 mt-2 font-medium">{sub}</div>
      )}
    </div>
  )
}

function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`
}

type DateRange = '7' | '30' | '90' | '365' | 'all'

export default function Management() {
  const { clients, loading: cl } = useClients()
  const { projects, loading: pl } = useProjects()
  const { invoices } = useInvoices()
  const { totalSeconds } = useTimeEntries()
  const { tasks } = useTasks()
  const [range, setRange] = useState<DateRange>('30')

  const rangeStart = useMemo<Date | null>(() => {
    if (range === 'all') return null
    const d = new Date()
    d.setDate(d.getDate() - Number(range))
    return d
  }, [range])

  const inRange = (iso: string | null | undefined): boolean =>
    !rangeStart || (!!iso && new Date(iso) >= rangeStart)

  const stats = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === 'active').length
    const leads = clients.filter((c) => c.status === 'lead').length
    const activeProjects = projects.filter((p) => p.status === 'active').length
    const totalRevenue = invoices
      .filter((i) => i.status === 'paid' && inRange(i.issue_date || i.created_at))
      .reduce((s, i) => s + Number(i.total || 0), 0)
    const outstanding = invoices
      .filter((i) => ['sent', 'overdue'].includes(i.status))
      .reduce((s, i) => s + Number(i.total || 0), 0)
    return { activeClients, leads, activeProjects, totalRevenue, outstanding }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, projects, invoices, range])

  const openTasksCount = tasks.filter((t) => t.status !== 'done').length
  const highPriorityOpen = tasks.filter(
    (t) => t.priority === 'high' && t.status !== 'done'
  ).length

  const fmtMoney = (n: number): string =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n)

  const ranges: { id: DateRange; label: string }[] = [
    { id: '7', label: '7 days' },
    { id: '30', label: '30 days' },
    { id: '90', label: '90 days' },
    { id: '365', label: '1 year' },
    { id: 'all', label: 'All time' },
  ]

  const loading = cl || pl

  return (
    <AppLayout title="Management">
      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-1 p-1 bg-surface-2 border border-white/[0.06] rounded-xl self-start">
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                  range === r.id ? 'bg-primary/10 text-primary' : 'text-text/50 hover:text-text'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              icon={CircleDollarSign}
              label="Revenue"
              value={fmtMoney(stats.totalRevenue)}
              sub={`${fmtMoney(stats.outstanding)} outstanding`}
              accent
            />
            <StatCard
              icon={Users}
              label="Clients"
              value={clients.length}
              sub={`${stats.activeClients} active · ${stats.leads} leads`}
            />
            <StatCard
              icon={FolderKanban}
              label="Projects"
              value={projects.length}
              sub={`${stats.activeProjects} active`}
            />
            <StatCard
              icon={Clock}
              label="Hours tracked"
              value={formatHours(totalSeconds)}
              sub={`${invoices.length} invoices`}
            />
            <StatCard
              icon={CheckSquare}
              label="Open Tasks"
              value={openTasksCount}
              sub={`${highPriorityOpen} high priority`}
            />
          </div>
        </div>
      )}
    </AppLayout>
  )
}
