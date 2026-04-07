import { useEffect, useRef, useState } from 'react'
import { Bell, Plus, Pencil, Trash2, FileText, CheckCircle2 } from 'lucide-react'
import { useActivities } from '../hooks/useActivities.js'
import { cn } from '../lib/cn.js'

const ICON_MAP = {
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

const LABELS = {
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

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const STORAGE_KEY = 'cp-notif-seen'

export default function NotificationsBell() {
  const { activities } = useActivities(15)
  const [open, setOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(STORAGE_KEY) || '0')
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  const unread = activities.filter((a) => new Date(a.created_at).getTime() > Number(lastSeen)).length

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
            {activities.length === 0 ? (
              <div className="py-10 text-center text-sm text-text/40">Nothing yet</div>
            ) : (
              activities.map((a) => {
                const Icon = ICON_MAP[a.type] || CheckCircle2
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] border-b border-white/[0.04] last:border-0"
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0',
                        a.type.includes('deleted') ? 'text-red-400' : 'text-primary'
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
