import { useEffect, useState } from 'react'
import { Keyboard, X } from 'lucide-react'
import { cn } from '../lib/cn.js'

interface ShortcutRow {
  keys: string[]
  label: string
}

interface ShortcutGroup {
  title: string
  items: ShortcutRow[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    items: [
      { keys: ['g', 'd'], label: 'Dashboard' },
      { keys: ['g', 'c'], label: 'Clients' },
      { keys: ['g', 'p'], label: 'Projects' },
      { keys: ['g', 'q'], label: 'Quotes' },
      { keys: ['g', 'i'], label: 'Invoices' },
      { keys: ['g', 't'], label: 'Tasks' },
      { keys: ['g', 'n'], label: 'Notes' },
      { keys: ['g', 'm'], label: 'Inbox' },
      { keys: ['g', 'k'], label: 'Calendar' },
      { keys: ['g', 'r'], label: 'Reports' },
      { keys: ['g', 's'], label: 'Settings' },
    ],
  },
  {
    title: 'General',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['?'], label: 'Show this help' },
      { keys: ['Esc'], label: 'Close modal / palette' },
    ],
  },
]

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target
      if (
        target instanceof HTMLElement &&
        target.matches('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl border border-white/[0.1] shadow-card-lg bg-gradient-to-b from-surface-3 to-surface-2 animate-scale-in overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-bold tracking-tight text-text flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary" />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg text-text/50 hover:text-text hover:bg-white/5 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text/40 mb-3">
                {group.title}
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 h-8 px-2 rounded-lg hover:bg-white/[0.03]"
                  >
                    <span className="text-sm text-text/75">{row.label}</span>
                    <div className="flex items-center gap-1">
                      {row.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/[0.06] text-[11px] text-text/40 flex items-center justify-between">
          <span>Tip: shortcuts work globally except in input fields.</span>
          <span className="flex items-center gap-1">
            <Kbd>?</Kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded',
        'bg-white/[0.06] border border-white/[0.1] text-[11px] font-mono font-semibold text-text/80',
        'shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)]',
        className
      )}
    >
      {children}
    </kbd>
  )
}
