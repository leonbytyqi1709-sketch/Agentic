import { Search, Menu, Command } from 'lucide-react'
import NotificationsBell from '../NotificationsBell.js'

export interface TopbarProps {
  title: string
  onMenu?: () => void
}

export default function Topbar({ title, onMenu }: TopbarProps) {
  function openPalette() {
    const ev = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    })
    window.dispatchEvent(ev)
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8 border-b border-white/[0.06] gap-3 glass relative z-10">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenu}
          className="lg:hidden w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text/70 hover:bg-white/[0.08] active:scale-95 transition-all"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-text truncate">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={openPalette}
          className="hidden md:flex h-9 w-64 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 text-xs text-text/40 hover:bg-white/[0.06] hover:border-white/[0.14] items-center gap-2 transition-all group"
        >
          <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
          <span className="flex-1 text-left">Search everything...</span>
          <kbd className="text-[10px] text-text/50 border border-white/[0.08] bg-white/[0.04] rounded px-1.5 py-0.5 flex items-center gap-0.5 font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
        <NotificationsBell />
      </div>
    </header>
  )
}
