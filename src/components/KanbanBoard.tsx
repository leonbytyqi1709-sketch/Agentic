import { useState } from 'react'
import type { DragEvent as ReactDragEvent, FormEvent, MouseEvent as ReactMouseEvent } from 'react'
import { Plus, Trash2, GripVertical, Flag } from 'lucide-react'
import Modal from './ui/Modal.js'
import Button from './ui/Button.js'
import Input from './ui/Input.js'
import { useTasks } from '../hooks/useTasks.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import type { Task, TaskInsert, TaskPriority, TaskStatus } from '../types'

interface ColumnDef {
  id: TaskStatus
  label: string
  tint: string
}

const COLUMNS: ColumnDef[] = [
  { id: 'todo', label: 'To Do', tint: 'text-text/60' },
  { id: 'in_progress', label: 'In Progress', tint: 'text-blue-400' },
  { id: 'review', label: 'Review', tint: 'text-yellow-400' },
  { id: 'done', label: 'Done', tint: 'text-green-400' },
]

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'text-text/40',
  medium: 'text-blue-400',
  high: 'text-red-400',
}

interface KanbanFormState {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
}

export interface KanbanBoardProps {
  projectId: string
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId)
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [dragging, setDragging] = useState<Task | null>(null)
  const [form, setForm] = useState<KanbanFormState>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
  })
  const [saving, setSaving] = useState<boolean>(false)

  function openCreate(status: TaskStatus = 'todo') {
    setEditing(null)
    setForm({ title: '', description: '', status, priority: 'medium', due_date: '' })
    setModalOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setForm({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
    })
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: TaskInsert = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        project_id: projectId,
      }
      if (editing) {
        await updateTask(editing.id, payload)
        toast.success('Task updated')
      } else {
        await createTask(payload)
        toast.success('Task created')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTask(task.id)
      toast.success('Task deleted')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDrop(status: TaskStatus) {
    if (!dragging || dragging.status === status) {
      setDragging(null)
      return
    }
    try {
      await updateTask(dragging.id, { status })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDragging(null)
    }
  }

  const byCol = (col: TaskStatus): Task[] =>
    tasks.filter((t) => (t.status || 'todo') === col)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-text">Tasks</h3>
          <p className="text-xs text-text/40">{tasks.length} total</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              onDragOver={(e: ReactDragEvent<HTMLDivElement>) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
              className="bg-surface-2 rounded-xl border border-white/[0.06] p-3 min-h-[300px] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-semibold uppercase tracking-wide', col.tint)}>
                    {col.label}
                  </span>
                  <span className="text-xs text-text/40">{byCol(col.id).length}</span>
                </div>
                <button
                  onClick={() => openCreate(col.id)}
                  className="w-6 h-6 rounded-md text-text/40 hover:text-text hover:bg-white/5 flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {byCol(col.id).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragging(task)}
                  onClick={() => openEdit(task)}
                  className="group bg-background/60 border border-white/[0.06] rounded-lg p-3 hover:border-primary/40 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-3 h-3 text-text/30 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text line-clamp-2">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-text/50 mt-1 line-clamp-2">
                          {task.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className={cn(
                            'flex items-center gap-1 text-[10px]',
                            PRIORITY_STYLES[task.priority]
                          )}
                        >
                          <Flag className="w-3 h-3" />
                          {task.priority}
                        </div>
                        {task.due_date && (
                          <span className="text-[10px] text-text/40">
                            {new Date(task.due_date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        handleDelete(task)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-text/40 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {byCol(col.id).length === 0 && (
                <div className="text-[11px] text-text/30 text-center py-4 select-none">
                  Drop tasks here
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit Task' : 'New Task'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Design homepage hero"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text/30 focus:border-primary/50 focus:outline-none transition-colors resize-none"
              placeholder="Optional..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <Input
            label="Due date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
