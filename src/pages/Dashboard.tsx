import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  Users,
  FolderKanban,
  CircleDollarSign,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useActivities } from '../hooks/useActivities.js'
import { useTimeEntries } from '../hooks/useTimeEntries.js'
import { useTasks } from '../hooks/useTasks.js'
import { useProfile } from '../hooks/useProfile.js'
import GrowthChart from '../components/dashboard/GrowthChart.js'
import type { GrowthChartDatum } from '../components/dashboard/GrowthChart.js'
import StatusChart from '../components/dashboard/StatusChart.js'
import type { StatusChartDatum } from '../components/dashboard/StatusChart.js'
import { Link } from 'react-router-dom'
import type { ProjectStatus } from '../types'

type IconComponent = ComponentType<{ className?: string }>

interface ActivityMeta {
  icon: IconComponent
  color: string
  label: string
}

const ACTIVITY_META: Record<string, ActivityMeta> = {
  'client.created': { icon: Plus, color: 'text-green-400', label: 'Created client' },
  'client.updated': { icon: Pencil, color: 'text-blue-400', label: 'Updated client' },
  'client.deleted': { icon: Trash2, color: 'text-red-400', label: 'Deleted client' },
  'project.created': { icon: Plus, color: 'text-green-400', label: 'Created project' },
  'project.updated': { icon: Pencil, color: 'text-blue-400', label: 'Updated project' },
  'project.deleted': { icon: Trash2, color: 'text-red-400', label: 'Deleted project' },
  'task.created': { icon: Plus, color: 'text-green-400', label: 'Created task' },
  'task.deleted': { icon: Trash2, color: 'text-red-400', label: 'Deleted task' },
  'invoice.created': { icon: FileText, color: 'text-primary', label: 'Created invoice' },
  'invoice.deleted': { icon: Trash2, color: 'text-red-400', label: 'Deleted invoice' },
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('de-DE')
}

interface StatCardProps {
  icon: IconComponent
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  trend?: 'up' | 'down' | null
}

function StatCard({ icon: Icon, label, value, sub, accent = false }: StatCardProps) {
  return (
    <div className="card card-hover p-6 relative overflow-hidden group">
      {/* Background gradient accent */}
      {accent && (
        <div className="absolute inset-0 bg-gradient-primary-soft opacity-60 pointer-events-none" />
      )}
      {/* Corner decoration */}
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
  const h = seconds / 3600
  return `${h.toFixed(1)}h`
}

type DateRange = '7' | '30' | '90' | '365' | 'all'

export default function Dashboard() {
  const { clients, loading: cl } = useClients()
  const { projects, loading: pl } = useProjects()
  const { invoices } = useInvoices()
  const { activities } = useActivities(10)
  const { totalSeconds } = useTimeEntries()
  const { tasks, updateTask } = useTasks()
  const { profile } = useProfile()
  const [range, setRange] = useState<DateRange>('30')

  const rangeStart = useMemo<Date | null>(() => {
    if (range === 'all') return null
    const d = new Date()
    d.setDate(d.getDate() - Number(range))
    return d
  }, [range])

  const inRange = (iso: string | null | undefined): boolean =>
    !rangeStart || (!!iso && new Date(iso) >= rangeStart)

  const upcoming = useMemo(() => {
    const now = new Date()
    const in14 = new Date(now.getTime() + 14 * 86400000)
    return projects
      .filter(
        (p) =>
          p.due_date &&
          new Date(p.due_date) >= now &&
          new Date(p.due_date) <= in14
      )
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
  }, [projects])

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

  const trendData = useMemo<GrowthChartDatum[]>(() => {
    interface MonthBucket {
      key: string
      label: string
      clients: number
      projects: number
      revenue: number
    }
    const months: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('de-DE', { month: 'short' }),
        clients: 0,
        projects: 0,
        revenue: 0,
      }
    })
    const findBucket = (iso: string): MonthBucket | undefined => {
      const d = new Date(iso)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return months.find((m) => m.key === key)
    }
    clients.forEach((c) => {
      if (c.created_at) {
        const b = findBucket(c.created_at)
        if (b) b.clients += 1
      }
    })
    projects.forEach((p) => {
      if (p.created_at) {
        const b = findBucket(p.created_at)
        if (b) b.projects += 1
      }
    })
    invoices
      .filter((i) => i.status === 'paid')
      .forEach((i) => {
        const b = findBucket(i.issue_date || i.created_at)
        if (b) b.revenue += Number(i.total || 0)
      })
    let cc = 0
    let pc = 0
    return months.map((m) => {
      cc += m.clients
      pc += m.projects
      return { label: m.label, clients: cc, projects: pc, revenue: m.revenue }
    })
  }, [clients, projects, invoices])

  const statusData = useMemo<StatusChartDatum[]>(() => {
    const buckets: Record<ProjectStatus, number> = {
      planning: 0,
      active: 0,
      on_hold: 0,
      completed: 0,
    }
    projects.forEach((p) => {
      if (buckets[p.status as ProjectStatus] != null) buckets[p.status as ProjectStatus] += 1
    })
    return (Object.entries(buckets) as [ProjectStatus, number][])
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v }))
  }, [projects])

  const fmtMoney = (n: number): string =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n)

  const openTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done')
        .sort((a, b) => {
          const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity
          const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity
          return ad - bd
        })
        .slice(0, 6),
    [tasks]
  )
  const openTasksCount = tasks.filter((t) => t.status !== 'done').length

  const recentProjects = projects.slice(0, 5)
  const loading = cl || pl

  const ranges: { id: DateRange; label: string }[] = [
    { id: '7', label: '7 days' },
    { id: '30', label: '30 days' },
    { id: '90', label: '90 days' },
    { id: '365', label: '1 year' },
    { id: 'all', label: 'All time' },
  ]

  return (
    <AppLayout title="Dashboard">
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
              sub={`${tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length} high priority`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GrowthChart data={trendData} />
            <StatusChart data={statusData} />
          </div>

          {upcoming.length > 0 && (
            <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <h3 className="text-sm font-semibold tracking-tight text-text mb-1">Upcoming deadlines</h3>
              <p className="text-xs text-text/40 mb-4">Next 14 days</p>
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {upcoming.map((p) => {
                  const days = Math.ceil(
                    (new Date(p.due_date!).getTime() - new Date().getTime()) / 86400000
                  )
                  const urgent = days <= 3
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </div>
                        <div className="text-xs text-text/40 truncate">{p.clients?.name || 'No client'}</div>
                      </div>
                      <div
                        className={`text-xs font-semibold shrink-0 pl-3 ${
                          urgent ? 'text-red-400' : 'text-yellow-400'
                        }`}
                      >
                        {days === 0 ? 'Today' : `${days}d`}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {openTasks.length > 0 && (
            <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-text">Open Tasks</h3>
                  <p className="text-xs text-text/40 mt-0.5">By priority and due date</p>
                </div>
                <Link
                  to="/tasks"
                  className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {openTasks.map((t) => {
                  const isOverdue =
                    t.due_date && new Date(t.due_date) < new Date()
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 group"
                    >
                      <button
                        onClick={() =>
                          updateTask(t.id, { status: 'done' }).catch(() => {})
                        }
                        className="text-text/40 hover:text-primary"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text truncate">{t.title}</div>
                        <div className="text-[10px] text-text/40 truncate">
                          {t.projects?.name || 'No project'}
                          {t.due_date && (
                            <>
                              {' · '}
                              <span className={isOverdue ? 'text-danger font-semibold' : ''}>
                                {new Date(t.due_date).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shrink-0 ${
                          t.priority === 'high'
                            ? 'bg-danger/10 text-danger'
                            : t.priority === 'medium'
                            ? 'bg-info/10 text-info'
                            : 'bg-white/[0.04] text-text/40'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <h3 className="text-sm font-semibold tracking-tight text-text mb-4">Recent Projects</h3>
              {recentProjects.length === 0 ? (
                <div className="text-sm text-text/40 py-6 text-center">No projects yet</div>
              ) : (
                <div className="flex flex-col divide-y divide-white/[0.04]">
                  {recentProjects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text truncate">{p.name}</div>
                        <div className="text-xs text-text/40 truncate">{p.clients?.name || 'No client'}</div>
                      </div>
                      <div className="text-xs text-text/50 shrink-0 pl-3">
                        {p.budget != null ? fmtMoney(p.budget) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <h3 className="text-sm font-semibold tracking-tight text-text mb-1">Activity</h3>
              <p className="text-xs text-text/40 mb-4">Recent events</p>
              {activities.length === 0 ? (
                <div className="text-sm text-text/40 py-6 text-center">No activity yet</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activities.map((a) => {
                    const meta: ActivityMeta =
                      ACTIVITY_META[a.type] || {
                        icon: CheckCircle2,
                        color: 'text-text/50',
                        label: a.type,
                      }
                    const Icon = meta.icon
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-md bg-white/5 flex items-center justify-center ${meta.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text truncate">
                            <span className="text-text/50">{meta.label}</span>{' '}
                            <span className="font-semibold">{a.entity_name}</span>
                          </div>
                          <div className="text-[10px] text-text/40">{timeAgo(a.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
