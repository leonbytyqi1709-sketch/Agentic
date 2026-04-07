import { cn } from '../../lib/cn.js'

const variants = {
  primary:
    'bg-primary text-white font-semibold shadow-glow-primary hover:bg-accent',
  secondary:
    'bg-white/5 text-text border border-white/10 font-medium hover:bg-white/10',
  ghost:
    'bg-transparent text-text/50 border border-white/[0.06] font-medium hover:text-text hover:border-white/15',
}

export default function Button({
  variant = 'primary',
  className,
  children,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 h-9 text-sm transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
