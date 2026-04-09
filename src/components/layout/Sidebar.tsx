import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  LineChart,
  FolderKanban,
  FileText,
  BarChart3,
  Receipt,
  LayoutTemplate,
  Calendar as CalendarIcon,
  CheckSquare,
  StickyNote,
  Mail,
  Settings as SettingsIcon,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn.js'
import { useAuthStore } from '../../store/authStore.js'
import { useProfile } from '../../hooks/useProfile.js'
import { useInvoices } from '../../hooks/useInvoices.js'
import { useProjects } from '../../hooks/useProjects.js'
import Logo from '../Logo.js'

type IconComponent = ComponentType<{ className?: string }>

interface NavItem {
  to: string
  label: string
  icon: IconComponent
}

const nav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/management', label: 'Management', icon: LineChart },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/inbox', label: 'Inbox', icon: Mail },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
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
    (p) =>
      p.due_date && new Date(p.due_date) <= soon && new Date(p.due_date) >= now
  ).length

  const badges: Record<string, number> = {
    '/invoices': overdueCount,
    '/projects': activeProjectsCount,
    '/dashboard': dueSoonCount,
  }

  const displayName =
    profile?.full_name ||
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    user?.email?.split('@')[0] ||
    'Account'

  return (
    <aside className="w-64 shrink-0 glass border-r border-white/[0.06] flex flex-col h-full relative">
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex items-center justify-between px-5 py-6 relative">
        <Logo size={36} glow withWordmark wordmarkClassName="text-[17px]" />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg text-text/50 hover:text-text hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-3 mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-text/30 px-3 mb-1.5">
          Workspace
        </div>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }) => {
          const badge = badges[to] ?? 0
          const isOverdue = to === '/invoices' && overdueCount > 0
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'text-primary bg-primary/[0.08]'
                    : 'text-text/55 hover:text-text hover:bg-white/[0.03]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-gradient-to-b from-primary to-primary-dark rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      'w-[18px] h-[18px] shrink-0 transition-transform',
                      'group-hover:scale-110'
                    )}
                  />
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 min-w-[18px] h-4 rounded-full flex items-center justify-center',
                        isOverdue
                          ? 'bg-danger text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                          : 'bg-white/[0.08] text-text/70'
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3 bg-gradient-to-b from-transparent to-black/20">
        <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-white/10 shadow-lg"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs font-bold shadow-glow-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text truncate leading-tight">
              {displayName}
            </div>
            <div className="text-[11px] text-text/40 truncate leading-tight mt-0.5">
              {user?.email || 'Free plan'}
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-xs font-medium text-text/50 hover:text-danger hover:bg-danger-bg transition-all duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
