import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Bell } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useRecurringInvoices } from '../hooks/useRecurringInvoices.js'
import { useEvents } from '../hooks/useEvents.js'
import { useClients } from '../hooks/useClients.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import type { EventColor, EventInsert, EventWithRelations } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type View = 'month' | 'week'

interface CalendarItem {
  id: string
  type: 'project' | 'invoice' | 'recurring' | 'event'
  title: string
  to?: string
  color: string
  starts_at?: string
  raw?: EventWithRelations
}

const COLOR_STYLES: Record<EventColor, string> = {
  primary: 'text-primary bg-primary/10 border-primary/20',
  success: 'text-success bg-success/10 border-success/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  info: 'text-info bg-info/10 border-info/20',
  neutral: 'text-text/70 bg-white/5 border-white/10',
}

export default function Calendar() {
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const { projects } = useProjects()
  const { invoices } = useInvoices()
  const { recurring } = useRecurringInvoices()
  const { clients } = useClients()
  const { events, createEvent, updateEvent, deleteEvent } = useEvents()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EventWithRelations | null>(null)
  const [defaultDate, setDefaultDate] = useState<string>('')

  const itemsByDay = useMemo<Record<string, CalendarItem[]>>(() => {
    const map: Record<string, CalendarItem[]> = {}
    const add = (dateStr: string | null | undefined, item: CalendarItem) => {
      if (!dateStr) return
      const key = dateStr.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    projects.forEach((p) =>
      add(p.due_date, {
        id: `p-${p.id}`,
        type: 'project',
        title: p.name,
        to: `/projects/${p.id}`,
        color: 'text-primary bg-primary/10 border-primary/20',
      })
    )
    invoices.forEach((i) =>
      add(i.due_date, {
        id: `i-${i.id}`,
        type: 'invoice',
        title: i.number,
        to: `/invoices/${i.id}`,
        color:
          i.status === 'overdue'
            ? 'text-danger bg-danger/10 border-danger/20'
            : 'text-info bg-info/10 border-info/20',
      })
    )
    recurring.forEach((r) =>
      add(r.next_run, {
        id: `r-${r.id}`,
        type: 'recurring',
        title: r.name,
        to: '/recurring',
        color: 'text-success bg-success/10 border-success/20',
      })
    )
    events.forEach((e) =>
      add(e.starts_at, {
        id: `e-${e.id}`,
        type: 'event',
        title: e.title,
        color: COLOR_STYLES[e.color],
        starts_at: e.starts_at,
        raw: e,
      })
    )
    // Sort each day's items by time (events first by time, deadlines after)
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        if (a.starts_at && b.starts_at)
          return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        if (a.starts_at) return -1
        if (b.starts_at) return 1
        return 0
      })
    })
    return map
  }, [projects, invoices, recurring, events])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  function shift(n: number) {
    const d = new Date(cursor)
    if (view === 'month') d.setMonth(d.getMonth() + n)
    else d.setDate(d.getDate() + n * 7)
    setCursor(d)
  }

  function goToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setCursor(d)
  }

  function openCreate(date?: string) {
    setEditing(null)
    setDefaultDate(date || today)
    setModalOpen(true)
  }

  function openEdit(ev: EventWithRelations) {
    setEditing(ev)
    setModalOpen(true)
  }

  // Build cells
  const cells = useMemo(() => {
    if (view === 'month') {
      const year = cursor.getFullYear()
      const month = cursor.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const offset = (firstDay.getDay() + 6) % 7
      const daysInMonth = lastDay.getDate()
      const arr: (Date | null)[] = []
      for (let i = 0; i < offset; i++) arr.push(null)
      for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d))
      while (arr.length % 7 !== 0) arr.push(null)
      return arr
    }
    // week
    const start = new Date(cursor)
    const dow = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [view, cursor])

  const headerLabel = useMemo(() => {
    if (view === 'month') {
      return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    }
    const start = new Date(cursor)
    const dow = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dow)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.getDate()}. ${MONTHS[start.getMonth()]} – ${end.getDate()}. ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
  }, [view, cursor])

  return (
    <AppLayout title="Calendar">
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shift(-1)}
              className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.14] active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shift(1)}
              className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.14] active:scale-95 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="h-9 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold uppercase tracking-widest text-text/70 hover:bg-primary/10 hover:border-primary/30 hover:text-primary active:scale-95 transition-all"
            >
              Today
            </button>
            <div className="ml-2 flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              {(['month', 'week'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'h-7 px-3 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all',
                    view === v
                      ? 'bg-primary/15 text-primary'
                      : 'text-text/50 hover:text-text'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-text">{headerLabel}</h2>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 text-[11px] text-text/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Project
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-info" />
                Invoice
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                Event
              </span>
            </div>
            <button
              onClick={() => openCreate()}
              className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark active:scale-95 transition-all flex items-center gap-2 shadow-glow-primary"
            >
              <Plus className="w-4 h-4" /> New Event
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-7 gap-1.5 mb-2">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-[10px] font-bold uppercase tracking-widest text-text/35 text-center py-2"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="relative grid grid-cols-7 gap-1.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="min-h-[110px] rounded-lg bg-transparent" />
            const key = day.toISOString().slice(0, 10)
            const dayItems = itemsByDay[key] || []
            const isToday = key === today
            const isPast = key < today
            const isCurrentMonth =
              view === 'week' || day.getMonth() === cursor.getMonth()
            return (
              <div
                key={key}
                className={cn(
                  'rounded-xl border p-2 flex flex-col gap-1 transition-all hover:border-white/[0.14] hover:-translate-y-[1px] cursor-pointer group',
                  view === 'month' ? 'min-h-[110px]' : 'min-h-[280px]',
                  isToday
                    ? 'bg-primary/[0.08] border-primary/40 shadow-[0_0_24px_rgba(225,29,72,0.15)]'
                    : isPast
                    ? 'bg-white/[0.01] border-white/[0.04]'
                    : 'bg-white/[0.02] border-white/[0.05]',
                  !isCurrentMonth && 'opacity-50'
                )}
                onDoubleClick={() => openCreate(key)}
              >
                <div
                  className={cn(
                    'text-xs font-bold flex items-center justify-between',
                    isToday ? 'text-primary' : isPast ? 'text-text/30' : 'text-text/70'
                  )}
                >
                  <span>{day.getDate()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openCreate(key)
                    }}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-white/[0.06] hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayItems.slice(0, view === 'week' ? 12 : 4).map((e) =>
                    e.type === 'event' && e.raw ? (
                      <button
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          openEdit(e.raw!)
                        }}
                        className={cn(
                          'text-[10px] px-1.5 py-1 rounded border truncate font-medium text-left flex items-center gap-1',
                          e.color
                        )}
                        title={e.title}
                      >
                        {!e.raw.all_day && (
                          <span className="opacity-70">
                            {new Date(e.raw.starts_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <span className="truncate">{e.title}</span>
                      </button>
                    ) : (
                      <Link
                        key={e.id}
                        to={e.to || '#'}
                        onClick={(ev) => ev.stopPropagation()}
                        className={cn(
                          'text-[10px] px-1.5 py-1 rounded border truncate font-medium',
                          e.color
                        )}
                        title={e.title}
                      >
                        {e.title}
                      </Link>
                    )
                  )}
                  {dayItems.length > (view === 'week' ? 12 : 4) && (
                    <div className="text-[9px] text-text/40 px-1">
                      +{dayItems.length - (view === 'week' ? 12 : 4)} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modalOpen && (
        <EventModal
          editing={editing}
          defaultDate={defaultDate}
          clients={clients}
          projects={projects}
          onClose={() => setModalOpen(false)}
          onSave={async (payload) => {
            try {
              if (editing) await updateEvent(editing.id, payload)
              else await createEvent(payload)
              toast.success(editing ? 'Event updated' : 'Event created')
              setModalOpen(false)
            } catch (e) {
              toast.error((e as Error).message)
            }
          }}
          onDelete={
            editing
              ? async () => {
                  if (!confirm('Delete this event?')) return
                  await deleteEvent(editing.id)
                  toast.info('Event deleted')
                  setModalOpen(false)
                }
              : undefined
          }
        />
      )}
    </AppLayout>
  )
}

interface EventModalProps {
  editing: EventWithRelations | null
  defaultDate: string
  clients: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  onClose: () => void
  onSave: (payload: EventInsert) => Promise<void>
  onDelete?: () => Promise<void>
}

const COLOR_OPTIONS: { id: EventColor; bg: string }[] = [
  { id: 'primary', bg: 'bg-primary' },
  { id: 'success', bg: 'bg-success' },
  { id: 'warning', bg: 'bg-warning' },
  { id: 'info', bg: 'bg-info' },
  { id: 'neutral', bg: 'bg-text/40' },
]

const REMINDERS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 15, label: '15 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
]

function EventModal({
  editing,
  defaultDate,
  clients,
  projects,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState<EventColor>('primary')
  const [reminder, setReminder] = useState<number | null>(1440)
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description || '')
      const start = new Date(editing.starts_at)
      setDate(start.toISOString().slice(0, 10))
      setTime(start.toTimeString().slice(0, 5))
      if (editing.ends_at) {
        setEndTime(new Date(editing.ends_at).toTimeString().slice(0, 5))
      }
      setAllDay(editing.all_day)
      setColor(editing.color)
      setReminder(editing.reminder_minutes)
      setClientId(editing.client_id || '')
      setProjectId(editing.project_id || '')
    }
  }, [editing])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    const startsAt = allDay
      ? new Date(`${date}T00:00:00`).toISOString()
      : new Date(`${date}T${time}:00`).toISOString()
    const endsAt = allDay
      ? null
      : new Date(`${date}T${endTime}:00`).toISOString()
    onSave({
      title: title.trim(),
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      color,
      reminder_minutes: reminder,
      client_id: clientId || null,
      project_id: projectId || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] shadow-card-lg bg-gradient-to-b from-surface-3 to-surface-2 animate-scale-in overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-bold tracking-tight text-text">
            {editing ? 'Edit Event' : 'New Event'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-text/50 hover:text-text hover:bg-white/5 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-text/70 cursor-pointer h-10">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                All day
              </label>
            </div>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                  Start
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                  End
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm resize-none focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
              Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    c.bg,
                    color === c.id
                      ? 'ring-2 ring-offset-2 ring-offset-surface ring-white/40 scale-110'
                      : 'opacity-60 hover:opacity-100'
                  )}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block flex items-center gap-1">
              <Bell className="w-3 h-3" /> Reminder
            </label>
            <select
              value={reminder ?? ''}
              onChange={(e) => setReminder(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
            >
              {REMINDERS.map((r) => (
                <option key={String(r.value)} value={r.value ?? ''}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-white/[0.06]">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="h-10 px-4 rounded-lg bg-danger-bg border border-danger/20 text-danger text-xs font-semibold hover:bg-danger/10 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-text/70 hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark shadow-glow-primary"
            >
              {editing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
