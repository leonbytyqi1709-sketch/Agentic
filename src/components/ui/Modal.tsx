import { useEffect } from 'react'
import type { ReactNode, MouseEvent as ReactMouseEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn.js'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  className?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Subtle primary glow behind modal */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div
        className={cn(
          'relative max-w-md w-full max-h-[92vh] overflow-y-auto',
          'rounded-2xl border border-white/[0.08] shadow-card-lg',
          'bg-gradient-to-b from-surface-3 to-surface-2',
          'animate-scale-in',
          className
        )}
        onClick={(e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />

        <div className="p-6">
          {title && (
            <div className="flex items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold tracking-tight text-text">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-text/50 hover:text-text hover:bg-white/[0.06] flex items-center justify-center transition-all active:scale-90 shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
