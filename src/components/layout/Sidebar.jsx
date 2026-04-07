import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  BarChart3,
  Receipt,
  Repeat,
  LayoutTemplate,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn.js'
import { useAuthStore } from '../../store/authStore.js'
import { useProfile } from '../../hooks/useProfile.js'
import { useInvoices } from '../../hooks/useInvoices.js'
import { useProjects } from '../../hooks/useProjects.js'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ onClose }) {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { profile } = useProfile()
  const { invoices } = useInvoices()
  const { projects } = useProjects()

  const overdueCount = invoices.filter((i) => i.status === 'overdue').length
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length
  const now = new Date()
  const soon = new Date()
  soon.setDate(now.getDate() + 3)
  const dueSoonCount = projects.filter(
    (p) => p.due_date && new Date(p.due_date) <= soon && new Date(p.due_date) >= now
  ).length

  const badges = {
    '/invoices': overdueCount,
    '/projects': activeProjectsCount,
    '/dashboard': dueSoonCount,
  }

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account'

  return (
    <aside className="w-60 shrink-0 bg-surface/50 backdrop-blur-xl border-r border-white/[0.06] flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-6 relative">
        <img
          src="/agentic-logo.png"
          alt="ClientPulse"
          className="w-16 h-16 drop-shadow-[0_0_28px_rgba(225,29,72,0.75)]"
        />
        <span className="text-lg font-bold tracking-tight text-text">ClientPulse</span>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden absolute right-3 top-3 w-8 h-8 rounded-lg text-text/50 hover:text-text hover:bg-white/5 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {nav.map(({ to, label, icon: Icon }) => {
          const badge = badges[to]
          const isOverdue = to === '/invoices' && overdueCount > 0
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text/50 hover:text-text/80 hover:bg-white/5'
                )
              }
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 min-w-[18px] h-4 rounded-full flex items-center justify-center',
                    isOverdue
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-text/70'
                  )}
                >
                  {badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 px-2 mb-2">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text truncate">{displayName}</div>
            <div className="text-xs text-text/40 truncate">{user?.email || 'Free plan'}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm font-medium text-text/50 hover:text-text hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
