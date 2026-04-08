import type { ComponentType } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore } from '../../store/toastStore.js'
import type { ToastType } from '../../store/toastStore.js'
import { cn } from '../../lib/cn.js'

type IconComponent = ComponentType<{ className?: string }>

const ICONS: Record<ToastType, IconComponent> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const STYLES: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-300',
  error: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-white/10 bg-surface-2 text-text',
}

export default function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-sm rounded-xl border backdrop-blur-xl shadow-card px-4 py-3 text-sm animate-slide-in',
              STYLES[t.type]
            )}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {t.title && (
                <div className="font-semibold text-text">{t.title}</div>
              )}
              <div className="text-text/80">{t.message}</div>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-text/40 hover:text-text shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
