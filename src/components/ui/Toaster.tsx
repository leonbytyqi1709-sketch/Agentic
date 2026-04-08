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

const BORDER_STYLES: Record<ToastType, string> = {
  success: 'border-success/30',
  error: 'border-danger/30',
  info: 'border-white/[0.1]',
}

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-success bg-success-bg',
  error: 'text-danger bg-danger-bg',
  info: 'text-primary bg-primary/10',
}

export default function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 min-w-[300px] rounded-xl border',
              'glass shadow-card-lg px-4 py-3 text-sm animate-slide-in-right',
              BORDER_STYLES[t.type]
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                'border border-white/[0.08]',
                ICON_STYLES[t.type]
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {t.title && (
                <div className="font-semibold text-text leading-tight mb-0.5">
                  {t.title}
                </div>
              )}
              <div className="text-text/80 leading-snug">{t.message}</div>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-text/40 hover:text-text shrink-0 p-1 -m-1 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
