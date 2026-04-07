import { forwardRef } from 'react'
import { cn } from '../../lib/cn.js'

const Input = forwardRef(function Input({ className, label, error, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs text-text/40 font-medium">{label}</label>
      )}
      <input
        ref={ref}
        className={cn(
          'h-11 bg-white/5 border border-white/10 rounded-lg px-3.5 text-sm text-text placeholder:text-text/30 focus:border-primary/50 focus:outline-none transition-colors w-full',
          error && 'border-primary/60',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-primary">{error}</span>}
    </div>
  )
})

export default Input
