import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FolderKanban, FileText, Repeat } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useRecurringInvoices } from '../hooks/useRecurringInvoices.js'
import { cn } from '../lib/cn.js'

const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So']

export default function Calendar() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const { projects } = useProjects()
  const { invoices } = useInvoices()
  const { recurring } = useRecurringInvoices()

  const events = useMemo(() => {
    const map = {}
    const add = (dateStr, event) => {
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
  const offset = (firstDay.getDay() + 6) % 7 // Monday-first
  const daysInMonth = lastDay.getDate()

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date().toISOString().slice(0, 10)

  function shift(n) {
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
      <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shift(-1)}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shift(1)}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold uppercase text-text/70 hover:bg-white/10"
            >
              Today
            </button>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-text">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-3 text-xs text-text/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" /> Project
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Invoice
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" /> Recurring
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-[10px] font-semibold uppercase tracking-wide text-text/40 text-center py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="min-h-[90px] rounded-lg bg-transparent" />
            const key = day.toISOString().slice(0, 10)
            const dayEvents = events[key] || []
            const isToday = key === today
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[90px] rounded-lg border border-white/[0.04] p-1.5 flex flex-col gap-1',
                  isToday ? 'bg-primary/5 border-primary/30' : 'bg-white/[0.02]'
                )}
              >
                <div
                  className={cn(
                    'text-xs font-semibold',
                    isToday ? 'text-primary' : 'text-text/60'
                  )}
                >
                  {day.getDate()}
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
