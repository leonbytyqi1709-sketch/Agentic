import { cn } from '../lib/cn.js'

export interface LogoProps {
  /** Pixel size (default 40) */
  size?: number
  /** Add glow effect (for hero placements) */
  glow?: boolean
  /** Extra classes */
  className?: string
  /** Show wordmark next to mark */
  withWordmark?: boolean
  /** Wordmark text size class */
  wordmarkClassName?: string
}

/**
 * ClientPulse Logo — uses the original agentic-logo.png.
 * Wrapper component so sizing, glow, and wordmark stay consistent everywhere.
 */
export default function Logo({
  size = 40,
  glow = false,
  className,
  withWordmark = false,
  wordmarkClassName = 'text-lg',
}: LogoProps) {
  const mark = (
    <img
      src="/agentic-logo.png"
      alt="ClientPulse"
      width={size}
      height={size}
      className={cn(
        'shrink-0 object-contain',
        glow && 'drop-shadow-[0_0_28px_rgba(225,29,72,0.75)]',
        className
      )}
      style={{ width: size, height: size }}
    />
  )

  if (!withWordmark) return mark

  return (
    <div className="inline-flex items-center gap-2.5">
      {mark}
      <span className={cn('font-bold tracking-tight text-text', wordmarkClassName)}>
        Client<span className="text-gradient-primary">Pulse</span>
      </span>
    </div>
  )
}
