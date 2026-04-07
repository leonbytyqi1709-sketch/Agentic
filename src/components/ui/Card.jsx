import { cn } from '../../lib/cn.js'

export default function Card({ className, children, ...props }) {
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
