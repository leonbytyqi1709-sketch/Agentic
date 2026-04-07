import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Calendar as CalendarIcon,
  Receipt,
  Repeat,
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

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { clients } = useClients()
  const { projects } = useProjects()
  const { invoices } = useInvoices()
  const signOut = useAuthStore((s) => s.signOut)

  useEffect(() => {
    function handleKey(e) {
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

  const actions = useMemo(
    () => [
      { id: 'nav-dash', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/dashboard') },
      { id: 'nav-clients', label: 'Go to Clients', icon: Users, action: () => navigate('/clients') },
      { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, action: () => navigate('/projects') },
      { id: 'nav-calendar', label: 'Go to Calendar', icon: CalendarIcon, action: () => navigate('/calendar') },
      { id: 'nav-templates', label: 'Go to Templates', icon: LayoutTemplate, action: () => navigate('/templates') },
      { id: 'nav-invoices', label: 'Go to Invoices', icon: FileText, action: () => navigate('/invoices') },
      { id: 'nav-recurring', label: 'Go to Recurring', icon: Repeat, action: () => navigate('/recurring') },
      { id: 'nav-expenses', label: 'Go to Expenses', icon: Receipt, action: () => navigate('/expenses') },
      { id: 'nav-reports', label: 'Go to Reports', icon: BarChart3, action: () => navigate('/reports') },
      { id: 'nav-settings', label: 'Go to Settings', icon: SettingsIcon, action: () => navigate('/settings') },
      { id: 'new-client', label: 'New Client', icon: Plus, action: () => navigate('/clients') },
      { id: 'new-project', label: 'New Project', icon: Plus, action: () => navigate('/projects') },
      { id: 'new-invoice', label: 'New Invoice', icon: Plus, action: () => navigate('/invoices') },
      { id: 'sign-out', label: 'Sign out', icon: LogOut, action: () => signOut() },
    ],
    [navigate, signOut]
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = []

    if (!q) {
      actions.forEach((a) => list.push({ ...a, kind: 'Action' }))
      return list
    }

    actions
      .filter((a) => a.label.toLowerCase().includes(q))
      .forEach((a) => list.push({ ...a, kind: 'Action' }))

    clients
      .filter((c) => c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q))
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

  function onKey(e) {
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-start justify-center pt-24 p-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-surface-2 border border-white/[0.08] rounded-2xl shadow-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-text/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search clients, projects, invoices... or run an action"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text/30 outline-none"
          />
          <kbd className="text-[10px] text-text/40 border border-white/10 rounded px-1.5 py-0.5">
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
