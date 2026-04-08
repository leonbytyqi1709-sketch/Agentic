import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn.js'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-primary to-primary-dark text-white font-semibold shadow-glow-primary hover:shadow-glow-primary-lg hover:-translate-y-[1px]',
  secondary:
    'bg-white/[0.04] text-text border border-white/[0.08] font-medium hover:bg-white/[0.08] hover:border-white/[0.14]',
  ghost:
    'bg-transparent text-text/60 border border-transparent font-medium hover:text-text hover:bg-white/[0.04]',
  danger:
    'bg-danger text-white font-semibold shadow-[0_8px_24px_rgba(244,63,94,0.35)] hover:bg-danger/90 hover:-translate-y-[1px]',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-6 text-sm gap-2 rounded-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 focus:outline-none',
        'active:scale-[0.97] active:duration-75',
        'disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
}
