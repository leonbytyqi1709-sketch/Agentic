import type { ComponentType, ReactNode } from 'react'
import { cn } from '../../lib/cn.js'

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

type IconComponent = ComponentType<{ className?: string }>

export interface BadgeProps {
  tone?: BadgeTone
  icon?: IconComponent
  children: ReactNode
  className?: string
  dot?: boolean
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-white/[0.05] text-text/60 border-white/[0.08]',
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success-bg text-success border-success/20',
  warning: 'bg-warning-bg text-warning border-warning/20',
  danger: 'bg-danger-bg text-danger border-danger/20',
  info: 'bg-info-bg text-info border-info/20',
}

const dotTones: Record<BadgeTone, string> = {
  neutral: 'bg-text/40',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export default function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider',
        'px-2 py-0.5 rounded-md border',
        tones[tone],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            dotTones[tone],
            tone !== 'neutral' && 'shadow-[0_0_8px_currentColor]'
          )}
        />
      )}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
