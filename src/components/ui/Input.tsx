import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.js'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] text-text/50 font-semibold uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'h-11 bg-white/[0.03] border rounded-lg px-3.5 text-sm text-text w-full',
          'placeholder:text-text/25',
          'focus:outline-none transition-all duration-150',
          'focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(225,29,72,0.12)]',
          error
            ? 'border-danger/50 focus:border-danger'
            : 'border-white/[0.08] focus:border-primary/50',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-[11px] text-danger font-medium flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-danger" />
          {error}
        </span>
      )}
      {hint && !error && <span className="text-[11px] text-text/40">{hint}</span>}
    </div>
  )
})

export default Input
