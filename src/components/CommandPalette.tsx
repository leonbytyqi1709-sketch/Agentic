import { useEffect, useMemo, useState, useRef } from 'react'
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Calendar as CalendarIcon,
  CheckSquare,
  StickyNote,
  Mail,
  Receipt,
  LayoutTemplate,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  LogOut,
} from 'lucide-react'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useAuthStore } from '../store/authStore.js'
import { cn } from '../lib/cn.js'

type IconComponent = ComponentType<{ className?: string }>

interface CommandItem {
  id: string
  label: string
  sub?: string | null
  icon: IconComponent
  kind: 'Action' | 'Client' | 'Project' | 'Invoice'
  action: () => void
}

export default function CommandPalette() {
  const [open, setOpen] = useState<boolean>(false)
  const [query, setQuery] = useState<string>('')
  const [selected, setSelected] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const { clients } = useClients()
  const { projects } = useProjects()
  const { invoices } = useInvoices()
  const signOut = useAuthStore((s) => s.signOut)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const actions: CommandItem[] = useMemo(
    () => [
      { id: 'nav-dash', label: 'Go to Dashboard', icon: LayoutDashboard, kind: 'Action', action: () => navigate('/dashboard') },
      { id: 'nav-clients', label: 'Go to Clients', icon: Users, kind: 'Action', action: () => navigate('/clients') },
      { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, kind: 'Action', action: () => navigate('/projects') },
      { id: 'nav-calendar', label: 'Go to Calendar', icon: CalendarIcon, kind: 'Action', action: () => navigate('/calendar') },
      { id: 'nav-tasks', label: 'Go to Tasks', icon: CheckSquare, kind: 'Action', action: () => navigate('/tasks') },
      { id: 'nav-notes', label: 'Go to Notes', icon: StickyNote, kind: 'Action', action: () => navigate('/notes') },
      { id: 'nav-inbox', label: 'Go to Inbox', icon: Mail, kind: 'Action', action: () => navigate('/inbox') },
      { id: 'nav-templates', label: 'Go to Templates', icon: LayoutTemplate, kind: 'Action', action: () => navigate('/templates') },
      { id: 'nav-invoices', label: 'Go to Invoices', icon: FileText, kind: 'Action', action: () => navigate('/invoices') },
      { id: 'nav-expenses', label: 'Go to Expenses', icon: Receipt, kind: 'Action', action: () => navigate('/expenses') },
      { id: 'nav-reports', label: 'Go to Reports', icon: BarChart3, kind: 'Action', action: () => navigate('/reports') },
      { id: 'nav-settings', label: 'Go to Settings', icon: SettingsIcon, kind: 'Action', action: () => navigate('/settings') },
      { id: 'new-client', label: 'New Client', icon: Plus, kind: 'Action', action: () => navigate('/clients') },
      { id: 'new-project', label: 'New Project', icon: Plus, kind: 'Action', action: () => navigate('/projects') },
      { id: 'new-invoice', label: 'New Invoice', icon: Plus, kind: 'Action', action: () => navigate('/invoices') },
      { id: 'sign-out', label: 'Sign out', icon: LogOut, kind: 'Action', action: () => signOut() },
    ],
    [navigate, signOut]
  )

  const results: CommandItem[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list: CommandItem[] = []

    if (!q) {
      actions.forEach((a) => list.push(a))
      return list
    }

    actions
      .filter((a) => a.label.toLowerCase().includes(q))
      .forEach((a) => list.push(a))

    clients
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((c) =>
        list.push({
          id: `c-${c.id}`,
          label: c.name,
          sub: c.company,
          icon: Users,
          kind: 'Client',
          action: () => navigate(`/clients/${c.id}`),
        })
      )

    projects
      .filter((p) => p.name?.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((p) =>
        list.push({
          id: `p-${p.id}`,
          label: p.name,
          sub: p.clients?.name,
          icon: FolderKanban,
          kind: 'Project',
          action: () => navigate(`/projects/${p.id}`),
        })
      )

    invoices
      .filter(
        (i) =>
          i.number?.toLowerCase().includes(q) ||
          i.clients?.name?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((i) =>
        list.push({
          id: `i-${i.id}`,
          label: i.number,
          sub: i.clients?.name,
          icon: FileText,
          kind: 'Invoice',
          action: () => navigate(`/invoices/${i.id}`),
        })
      )

    return list
  }, [query, actions, clients, projects, invoices, navigate])

  useEffect(() => {
    setSelected(0)
  }, [query])

  function onKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[selected]
      if (item) {
        item.action()
        setOpen(false)
      }
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-24 p-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div
        className="relative w-full max-w-xl rounded-2xl border border-white/[0.1] shadow-card-lg overflow-hidden bg-gradient-to-b from-surface-3 to-surface-2 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-primary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search clients, projects, invoices... or run an action"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text/30 outline-none"
          />
          <kbd className="text-[10px] text-text/50 border border-white/10 bg-white/[0.04] rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-sm text-text/40 text-center py-8">No results</div>
          ) : (
            results.map((r, idx) => {
              const Icon = r.icon
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    r.action()
                    setOpen(false)
                  }}
                  onMouseEnter={() => setSelected(idx)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 h-11 rounded-lg text-left transition-colors',
                    selected === idx ? 'bg-primary/10 text-text' : 'text-text/70 hover:bg-white/5'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center',
                      selected === idx ? 'bg-primary/20 text-primary' : 'bg-white/5 text-text/50'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.label}</div>
                    {r.sub && <div className="text-xs text-text/40 truncate">{r.sub}</div>}
                  </div>
                  <span className="text-[10px] text-text/30 uppercase tracking-wide">{r.kind}</span>
                </button>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between px-4 h-10 border-t border-white/[0.06] text-[10px] text-text/40">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
          </div>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  )
}
