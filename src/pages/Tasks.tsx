import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CheckSquare, Square, Trash2, Flag, AlertCircle } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import EmptyState from '../components/ui/EmptyState.js'
import { useTasks } from '../hooks/useTasks.js'
import { useProjects } from '../hooks/useProjects.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import type { TaskPriority, TaskStatus } from '../types'

type Filter = 'all' | 'open' | 'done' | 'high' | 'due_soon'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'high', label: 'High Priority' },
  { id: 'due_soon', label: 'Due Soon' },
]

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'text-text/40 bg-white/[0.04] border-white/[0.06]',
  medium: 'text-info bg-info/10 border-info/20',
  high: 'text-danger bg-danger/10 border-danger/20',
}

export default function Tasks() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const { projects } = useProjects()
  const [filter, setFilter] = useState<Filter>('open')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [projectId, setProjectId] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')

  const filtered = useMemo(() => {
    const now = new Date()
    const soon = new Date()
    soon.setDate(now.getDate() + 3)
    return tasks.filter((t) => {
      if (filter === 'open') return t.status !== 'done'
      if (filter === 'done') return t.status === 'done'
      if (filter === 'high') return t.priority === 'high' && t.status !== 'done'
      if (filter === 'due_soon') {
        if (!t.due_date || t.status === 'done') return false
        const d = new Date(t.due_date)
        return d <= soon
      }
      return true
    })
  }, [tasks, filter])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await createTask({
        title: title.trim(),
        priority,
        project_id: projectId || null,
        due_date: dueDate || null,
        status: 'todo',
      })
      setTitle('')
      setDueDate('')
      setProjectId('')
      setPriority('medium')
      toast.success('Task added')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function toggle(id: string, current: TaskStatus) {
    await updateTask(id, { status: current === 'done' ? 'todo' : 'done' })
  }

  async function remove(id: string) {
    await deleteTask(id)
    toast.info('Task deleted')
  }

  const counts = useMemo(() => {
    const now = new Date()
    const soon = new Date()
    soon.setDate(now.getDate() + 3)
    return {
      all: tasks.length,
      open: tasks.filter((t) => t.status !== 'done').length,
      done: tasks.filter((t) => t.status === 'done').length,
      high: tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length,
      due_soon: tasks.filter(
        (t) => t.due_date && t.status !== 'done' && new Date(t.due_date) <= soon
      ).length,
    } as Record<Filter, number>
  }, [tasks])

  return (
    <AppLayout title="Tasks">
      <div className="flex flex-col gap-6">
        {/* Quick Add */}
        <form
          onSubmit={handleAdd}
          className="card p-4 flex flex-col md:flex-row gap-2 items-stretch"
        >
          <input
            type="text"
            placeholder="Add a task and press enter…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 h-10 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
          />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'h-9 px-4 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all',
                filter === f.id
                  ? 'bg-primary/[0.12] border-primary/40 text-primary'
                  : 'bg-white/[0.03] border-white/[0.06] text-text/60 hover:text-text hover:border-white/[0.14]'
              )}
            >
              {f.label}
              <span className="ml-2 text-text/40">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="card p-2">
          {loading ? (
            <div className="p-10 text-center text-text/40 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks"
              description="Add your first task above to get started."
            />
          ) : (
            <ul className="flex flex-col">
              {filtered.map((t) => {
                const isDone = t.status === 'done'
                const isOverdue =
                  !isDone && t.due_date && new Date(t.due_date) < new Date()
                return (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <button
                      onClick={() => toggle(t.id, t.status)}
                      className="shrink-0 text-text/40 hover:text-primary transition-colors"
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-sm font-medium truncate',
                          isDone ? 'text-text/40 line-through' : 'text-text'
                        )}
                      >
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.projects?.name && (
                          <Link
                            to={`/projects/${t.project_id}`}
                            className="text-[10px] text-text/50 hover:text-primary uppercase tracking-wider font-semibold"
                          >
                            {t.projects.name}
                          </Link>
                        )}
                        {t.due_date && (
                          <span
                            className={cn(
                              'text-[10px] flex items-center gap-1 font-medium',
                              isOverdue ? 'text-danger' : 'text-text/40'
                            )}
                          >
                            {isOverdue && <AlertCircle className="w-3 h-3" />}
                            {new Date(t.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1',
                        PRIORITY_STYLES[t.priority]
                      )}
                    >
                      <Flag className="w-3 h-3" />
                      {t.priority}
                    </span>
                    <button
                      onClick={() => remove(t.id)}
                      className="shrink-0 w-8 h-8 rounded-lg text-text/30 hover:text-danger hover:bg-danger-bg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
