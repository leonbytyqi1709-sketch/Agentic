import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Menu, Command } from 'lucide-react'
import NotificationsBell from '../NotificationsBell.jsx'

export default function Topbar({ title, onMenu }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  function openPalette() {
    // Simulate Cmd+K
    const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true })
    window.dispatchEvent(ev)
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8 border-b border-white/[0.06] gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenu}
          className="lg:hidden w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text/70 hover:bg-white/10"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-text truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={openPalette}
          className="hidden md:flex h-9 w-56 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text/40 hover:bg-white/[0.08] items-center gap-2 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search everything...</span>
          <kbd className="text-[10px] border border-white/10 rounded px-1 py-0.5 flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
        <NotificationsBell />
      </div>
    </header>
  )
}
