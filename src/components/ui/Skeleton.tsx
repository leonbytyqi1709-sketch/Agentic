import { cn } from '../../lib/cn.js'

export interface SkeletonProps {
  className?: string
  width?: number | string
  height?: number | string
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{ width, height }}
    />
  )
}

export function SkeletonStatCard() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
        <Skeleton className="flex-1 h-8 rounded-lg" />
        <Skeleton className="flex-1 h-8 rounded-lg" />
        <Skeleton className="flex-1 h-8 rounded-lg" />
      </div>
    </div>
  )
}
