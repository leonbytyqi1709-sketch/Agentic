import type { ComponentType, ReactNode } from 'react'
import { cn } from '../../lib/cn.js'

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>

export interface EmptyStateProps {
  icon: IconComponent
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 px-6 text-center',
        'relative overflow-hidden rounded-2xl',
        className
      )}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-primary-soft opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-dots opacity-[0.4] pointer-events-none" />

      {/* Animated icon container */}
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-gradient-primary blur-2xl opacity-30 scale-150 animate-pulse" />
        <div
          className={cn(
            'relative w-20 h-20 rounded-2xl flex items-center justify-center',
            'bg-gradient-to-br from-surface-2 to-surface-3',
            'border border-white/[0.08] shadow-card-lg',
            'animate-float'
          )}
        >
          <Icon className="w-8 h-8 text-primary" strokeWidth={1.8} />
        </div>
      </div>

      <h3 className="relative text-xl font-bold tracking-tight text-text mb-2">{title}</h3>
      {description && (
        <p className="relative text-sm text-text/50 mb-6 max-w-sm">{description}</p>
      )}
      {action && <div className="relative">{action}</div>}
    </div>
  )
}
