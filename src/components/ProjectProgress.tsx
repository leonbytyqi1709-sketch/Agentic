import { useTasks } from '../hooks/useTasks.js'

export interface ProjectProgressProps {
  projectId: string
}

export default function ProjectProgress({ projectId }: ProjectProgressProps) {
  const { tasks } = useTasks(projectId)
  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text/50 mb-1.5">
        <span>Progress</span>
        <span className="font-semibold text-text">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
