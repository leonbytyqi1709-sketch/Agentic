import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.js'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export default function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
