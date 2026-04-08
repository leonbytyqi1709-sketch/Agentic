import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.js'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  hover?: boolean
  noPadding?: boolean
}

export default function Card({
  className,
  children,
  hover = false,
  noPadding = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'card',
        !noPadding && 'p-5',
        hover && 'card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
