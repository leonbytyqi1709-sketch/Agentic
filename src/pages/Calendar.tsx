import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useRecurringInvoices } from '../hooks/useRecurringInvoices.js'
import { cn } from '../lib/cn.js'

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

interface CalendarEvent {
  id: string
  type: 'project' | 'invoice' | 'recurring'
  title: string
  to: string
  color: string
}

export default function Calendar() {
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const { projects } = useProjects()
  const { invoices } = useInvoices()
  const { recurring } = useRecurringInvoices()

  const events = useMemo<Record<string, CalendarEvent[]>>(() => {
    const map: Record<string, CalendarEvent[]> = {}
    const add = (dateStr: string | null | undefined, event: CalendarEvent) => {
      if (!dateStr) return
      const key = dateStr.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(event)
    }
    projects.forEach((p) =>
      add(p.due_date, {
        id: `p-${p.id}`,
        type: 'project',
        title: p.name,
        to: `/projects/${p.id}`,
        color: 'text-primary bg-primary/10',
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
            ? 'text-red-400 bg-red-500/10'
            : 'text-blue-400 bg-blue-500/10',
      })
    )
    recurring.forEach((r) =>
      add(r.next_run, {
        id: `r-${r.id}`,
        type: 'recurring',
        title: r.name,
        to: '/recurring',
        color: 'text-green-400 bg-green-500/10',
      })
    )
    return map
  }, [projects, invoices, recurring])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const offset = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date().toISOString().slice(0, 10)

  function shift(n: number) {
    const d = new Date(cursor)
    d.setMonth(d.getMonth() + n)
    setCursor(d)
  }

  function goToday() {
    const d = new Date()
    d.setDate(1)
    setCursor(d)
  }

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
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-text">
            {MONTHS[month]} <span className="text-text/40">{year}</span>
          </h2>
          <div className="flex items-center gap-4 text-[11px] text-text/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(225,29,72,0.6)]" />
              <span className="font-medium">Project</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-info shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="font-medium">Invoice</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-medium">Recurring</span>
            </span>
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
            if (!day) return <div key={idx} className="min-h-[96px] rounded-lg bg-transparent" />
            const key = day.toISOString().slice(0, 10)
            const dayEvents = events[key] || []
            const isToday = key === today
            const isPast = key < today
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[96px] rounded-xl border p-2 flex flex-col gap-1 transition-all hover:border-white/[0.14] hover:-translate-y-[1px]',
                  isToday
                    ? 'bg-primary/[0.08] border-primary/40 shadow-[0_0_24px_rgba(225,29,72,0.15)]'
                    : isPast
                    ? 'bg-white/[0.01] border-white/[0.04]'
                    : 'bg-white/[0.02] border-white/[0.05]'
                )}
              >
                <div
                  className={cn(
                    'text-xs font-bold flex items-center justify-between',
                    isToday ? 'text-primary' : isPast ? 'text-text/30' : 'text-text/70'
                  )}
                >
                  <span>{day.getDate()}</span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((e) => (
                    <Link
                      key={e.id}
                      to={e.to}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded truncate font-medium',
                        e.color
                      )}
                      title={e.title}
                    >
                      {e.title}
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-text/40 px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
