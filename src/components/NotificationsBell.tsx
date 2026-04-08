import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  FolderKanban,
} from 'lucide-react'
import { useActivities } from '../hooks/useActivities.js'
import { useTasks } from '../hooks/useTasks.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useEvents } from '../hooks/useEvents.js'
import { CalendarClock } from 'lucide-react'
import { cn } from '../lib/cn.js'
import type { ActivityType } from '../types'

interface DeadlineAlert {
  id: string
  icon: ComponentType<{ className?: string }>
  title: string
  sub: string
  to: string
  tone: 'danger' | 'warning' | 'info'
}

type IconComponent = ComponentType<{ className?: string }>

const ICON_MAP: Record<string, IconComponent> = {
  'client.created': Plus,
  'client.updated': Pencil,
  'client.deleted': Trash2,
  'project.created': Plus,
  'project.updated': Pencil,
  'project.deleted': Trash2,
  'task.created': Plus,
  'task.deleted': Trash2,
  'invoice.created': FileText,
  'invoice.deleted': Trash2,
}

const LABELS: Record<string, string> = {
  'client.created': 'New client',
  'client.updated': 'Client updated',
  'client.deleted': 'Client deleted',
  'project.created': 'New project',
  'project.updated': 'Project updated',
  'project.deleted': 'Project deleted',
  'task.created': 'New task',
  'task.deleted': 'Task deleted',
  'invoice.created': 'New invoice',
  'invoice.deleted': 'Invoice deleted',
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const STORAGE_KEY = 'cp-notif-seen'

export default function NotificationsBell() {
  const { activities } = useActivities(15)
  const { tasks } = useTasks()
  const { projects } = useProjects()
  const { invoices } = useInvoices()
  const { events } = useEvents()
  const [open, setOpen] = useState<boolean>(false)
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || '0'
  )
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node | null
      if (ref.current && target && !ref.current.contains(target)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  const alerts = useMemo<DeadlineAlert[]>(() => {
    const now = new Date()
    const soon = new Date()
    soon.setDate(now.getDate() + 3)
    const list: DeadlineAlert[] = []
    invoices
      .filter((i) => i.status === 'overdue')
      .slice(0, 5)
      .forEach((i) =>
        list.push({
          id: `inv-${i.id}`,
          icon: FileText,
          title: `Invoice ${i.number} overdue`,
          sub: i.due_date ? `Due ${new Date(i.due_date).toLocaleDateString()}` : 'Overdue',
          to: `/invoices/${i.id}`,
          tone: 'danger',
        })
      )
    projects
      .filter(
        (p) =>
          p.due_date &&
          p.status !== 'completed' &&
          new Date(p.due_date) <= soon &&
          new Date(p.due_date) >= new Date(now.toDateString())
      )
      .slice(0, 5)
      .forEach((p) =>
        list.push({
          id: `prj-${p.id}`,
          icon: FolderKanban,
          title: p.name,
          sub: `Due ${new Date(p.due_date!).toLocaleDateString()}`,
          to: `/projects/${p.id}`,
          tone: 'warning',
        })
      )
    events
      .filter((e) => {
        const start = new Date(e.starts_at)
        if (start < now) return false
        const reminderMs = (e.reminder_minutes ?? 1440) * 60 * 1000
        return start.getTime() - now.getTime() <= reminderMs
      })
      .slice(0, 5)
      .forEach((e) => {
        const start = new Date(e.starts_at)
        list.push({
          id: `evt-${e.id}`,
          icon: CalendarClock,
          title: e.title,
          sub: e.all_day
            ? start.toLocaleDateString()
            : `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          to: '/calendar',
          tone: 'info',
        })
      })
    tasks
      .filter(
        (t) =>
          t.status !== 'done' &&
          t.due_date &&
          new Date(t.due_date) <= soon
      )
      .slice(0, 5)
      .forEach((t) => {
        const overdue = new Date(t.due_date!) < new Date(now.toDateString())
        list.push({
          id: `tsk-${t.id}`,
          icon: Clock,
          title: t.title,
          sub: overdue
            ? `Overdue · ${new Date(t.due_date!).toLocaleDateString()}`
            : `Due ${new Date(t.due_date!).toLocaleDateString()}`,
          to: '/tasks',
          tone: overdue ? 'danger' : 'warning',
        })
      })
    return list
  }, [invoices, projects, tasks, events])

  const unreadActivities = activities.filter(
    (a) => new Date(a.created_at).getTime() > Number(lastSeen)
  ).length
  const unread = unreadActivities + alerts.length

  function toggle() {
    setOpen((o) => !o)
    if (!open && activities.length) {
      const ts = String(new Date(activities[0].created_at).getTime())
      setLastSeen(ts)
      localStorage.setItem(STORAGE_KEY, ts)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <Bell className="w-4 h-4 text-text/70" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-surface-2 border border-white/[0.08] rounded-xl shadow-card overflow-hidden z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="text-sm font-semibold text-text">Notifications</div>
            <div className="text-xs text-text/40">Your recent activity</div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-text/40">
                  Deadlines
                </div>
                {alerts.map((a) => {
                  const Icon = a.icon
                  return (
                    <Link
                      key={a.id}
                      to={a.to}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] border-b border-white/[0.04]"
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                          a.tone === 'danger'
                            ? 'bg-danger/10 text-danger'
                            : a.tone === 'warning'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-info/10 text-info'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text font-semibold truncate flex items-center gap-1">
                          {a.tone === 'danger' && <AlertCircle className="w-3 h-3 text-danger" />}
                          {a.title}
                        </div>
                        <div className="text-[10px] text-text/50">{a.sub}</div>
                      </div>
                    </Link>
                  )
                })}
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-text/40 border-t border-white/[0.04]">
                  Activity
                </div>
              </div>
            )}
            {activities.length === 0 && alerts.length === 0 ? (
              <div className="py-10 text-center text-sm text-text/40">Nothing yet</div>
            ) : (
              activities.map((a) => {
                const Icon = ICON_MAP[a.type] || CheckCircle2
                const typeStr = a.type as ActivityType | string
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] border-b border-white/[0.04] last:border-0"
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0',
                        typeStr.includes('deleted') ? 'text-red-400' : 'text-primary'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text truncate">
                        <span className="text-text/60">{LABELS[a.type] || a.type}</span>{' '}
                        <span className="font-semibold">{a.entity_name}</span>
                      </div>
                      <div className="text-[10px] text-text/40">{timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
