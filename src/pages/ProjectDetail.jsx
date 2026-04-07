import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CircleDollarSign,
  User,
  Activity,
  LayoutGrid,
  Clock,
  Info,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import KanbanBoard from '../components/KanbanBoard.jsx'
import TimeTracker from '../components/TimeTracker.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn.js'
import Attachments from '../components/Attachments.jsx'
import { TagBadges } from '../components/TagPicker.jsx'

const STATUS_STYLES = {
  planning: 'bg-white/5 text-text/50',
  active: 'bg-green-500/10 text-green-400',
  on_hold: 'bg-yellow-500/10 text-yellow-400',
  completed: 'bg-primary/10 text-primary',
}

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'tasks', label: 'Tasks', icon: LayoutGrid },
  { id: 'time', label: 'Time', icon: Clock },
]

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) return
      setLoading(true)
      const { data } = await supabase
        .from('projects')
        .select('*, clients(id, name, company)')
        .eq('id', id)
        .single()
      if (cancelled) return
      setProject(data)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <AppLayout title="Project">
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 text-sm text-text/50 hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : !project ? (
        <div className="text-sm text-text/50">Project not found.</div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-bold tracking-tight text-text">{project.name}</h2>
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                      STATUS_STYLES[project.status] || STATUS_STYLES.planning
                    )}
                  >
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>
                {project.clients ? (
                  <Link
                    to={`/clients/${project.clients.id}`}
                    className="text-sm text-text/50 hover:text-primary transition-colors"
                  >
                    {project.clients.name}
                    {project.clients.company && ` · ${project.clients.company}`}
                  </Link>
                ) : (
                  <div className="text-sm text-text/40">No client linked</div>
                )}
              </div>
            </div>
            {project.description && (
              <p className="text-sm text-text/70 whitespace-pre-wrap mt-5">{project.description}</p>
            )}
            <div className="mt-3">
              <TagBadges tagIds={project.tag_ids || []} />
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-surface-2 border border-white/[0.06] rounded-xl self-start">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-colors',
                  tab === id ? 'bg-primary/10 text-primary' : 'text-text/50 hover:text-text'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text/40 font-medium uppercase tracking-wide">Budget</span>
                  <CircleDollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-xl font-bold tracking-tight text-text">{fmtMoney(project.budget)}</div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text/40 font-medium uppercase tracking-wide">Start</span>
                  <Calendar className="w-4 h-4 text-text/60" />
                </div>
                <div className="text-xl font-bold tracking-tight text-text">{fmtDate(project.start_date)}</div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text/40 font-medium uppercase tracking-wide">Due</span>
                  <Calendar className="w-4 h-4 text-text/60" />
                </div>
                <div className="text-xl font-bold tracking-tight text-text">{fmtDate(project.due_date)}</div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text/40 font-medium uppercase tracking-wide">Status</span>
                  <Activity className="w-4 h-4 text-text/60" />
                </div>
                <div className="text-xl font-bold tracking-tight text-text">
                  {STATUS_LABELS[project.status] || project.status}
                </div>
              </div>
              {project.clients && (
                <div className="sm:col-span-2 lg:col-span-4 bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
                  <h3 className="text-sm font-semibold tracking-tight text-text mb-3">Client</h3>
                  <Link
                    to={`/clients/${project.clients.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                        {project.clients.name}
                      </div>
                      {project.clients.company && (
                        <div className="text-xs text-text/40">{project.clients.company}</div>
                      )}
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && <KanbanBoard projectId={project.id} />}
          {tab === 'time' && <TimeTracker projectId={project.id} project={project} />}
          {tab === 'overview' && <Attachments entityType="project" entityId={project.id} />}
        </div>
      )}
    </AppLayout>
  )
}
