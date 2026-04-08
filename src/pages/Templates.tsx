import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Copy, Pencil, Trash2, LayoutTemplate } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import Modal from '../components/ui/Modal.js'
import EmptyState from '../components/ui/EmptyState.js'
import { useTemplates } from '../hooks/useTemplates.js'
import { useProjects } from '../hooks/useProjects.js'
import { useTasks } from '../hooks/useTasks.js'
import { toast } from '../store/toastStore.js'
import type {
  ProjectStatus,
  ProjectTemplate,
  ProjectTemplateInsert,
  TaskPriority,
  TaskStatus,
  TemplateTask,
} from '../types'

const EMPTY_TASK: TemplateTask = { title: '', status: 'todo', priority: 'medium' }

interface TemplateFormState {
  name: string
  description: string
  default_budget: number | string
  default_status: ProjectStatus
}

const EMPTY: TemplateFormState = {
  name: '',
  description: '',
  default_budget: '',
  default_status: 'planning',
}

export default function Templates() {
  const { templates, loading, create, update, remove } = useTemplates()
  const { createProject } = useProjects()
  const { createTask } = useTasks()
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editing, setEditing] = useState<ProjectTemplate | null>(null)
  const [form, setForm] = useState<TemplateFormState>(EMPTY)
  const [tasks, setTasks] = useState<TemplateTask[]>([{ ...EMPTY_TASK }])
  const [saving, setSaving] = useState<boolean>(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(null)
  const [cloning, setCloning] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setTasks([{ ...EMPTY_TASK }])
    setModalOpen(true)
  }

  function openEdit(t: ProjectTemplate) {
    setEditing(t)
    setForm({
      name: t.name || '',
      description: t.description || '',
      default_budget: t.default_budget ?? '',
      default_status: (t.default_status as ProjectStatus) || 'planning',
    })
    setTasks(t.tasks?.length ? t.tasks : [{ ...EMPTY_TASK }])
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: ProjectTemplateInsert = {
        name: form.name,
        description: form.description || null,
        default_budget: form.default_budget === '' ? null : Number(form.default_budget),
        default_status: form.default_status,
        tasks: tasks.filter((t) => t.title.trim()),
      }
      if (editing) {
        await update(editing.id, payload)
        toast.success('Template updated')
      } else {
        await create(payload)
        toast.success('Template created')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleClone(t: ProjectTemplate) {
    setCloning(t.id)
    try {
      const project = await createProject({
        name: `${t.name} (copy)`,
        description: t.description || null,
        status: (t.default_status as ProjectStatus) || 'planning',
        budget: t.default_budget,
      })
      for (const task of t.tasks || []) {
        await createTask({
          project_id: project.id,
          title: task.title,
          status: (task.status as TaskStatus) || 'todo',
          priority: (task.priority as TaskPriority) || 'medium',
        })
      }
      toast.success(`Created "${project.name}"`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCloning(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast.success('Deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function updateTask(idx: number, patch: Partial<TemplateTask>) {
    setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }
  function addTask() {
    setTasks((prev) => [...prev, { ...EMPTY_TASK }])
  }
  function removeTask(idx: number) {
    setTasks((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <AppLayout title="Templates">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text/50">Project templates for quick setup</p>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates yet"
          description="Create reusable project structures and clone them in one click."
          action={
            <Button onClick={openCreate} size="lg">
              <Plus className="w-4 h-4" /> New Template
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <h3 className="text-base font-bold tracking-tight text-text mb-1">{t.name}</h3>
              {t.description && (
                <p className="text-xs text-text/50 line-clamp-2 mb-3">{t.description}</p>
              )}
              <div className="text-xs text-text/40 mb-4">
                {t.tasks?.length || 0} tasks · {t.default_status}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => handleClone(t)}
                  disabled={cloning === t.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {cloning === t.id ? 'Creating...' : 'Use'}
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-text/60 border border-white/[0.06] hover:text-text hover:border-white/15"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(t)}
                  className="w-8 h-8 rounded-lg text-text/50 hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit Template' : 'New Template'}
        className="max-w-xl"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Template name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Website Redesign"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-primary/50 focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Default budget"
              type="number"
              value={form.default_budget}
              onChange={(e) => setForm({ ...form, default_budget: e.target.value })}
              placeholder="5000"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Default status</label>
              <select
                value={form.default_status}
                onChange={(e) =>
                  setForm({ ...form, default_status: e.target.value as ProjectStatus })
                }
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text/40 font-medium">Default tasks</label>
            {tasks.map((t, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  className="col-span-7 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 outline-none"
                  placeholder="Task title"
                  value={t.title}
                  onChange={(e) => updateTask(idx, { title: e.target.value })}
                />
                <select
                  value={t.status}
                  onChange={(e) => updateTask(idx, { status: e.target.value as TaskStatus })}
                  className="col-span-2 h-10 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-text focus:border-primary/50 outline-none"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">Doing</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={t.priority}
                  onChange={(e) => updateTask(idx, { priority: e.target.value as TaskPriority })}
                  className="col-span-2 h-10 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-text focus:border-primary/50 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Med</option>
                  <option value="high">High</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeTask(idx)}
                  className="col-span-1 h-10 rounded-lg text-text/40 hover:text-red-400 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addTask} className="text-xs text-primary hover:text-accent font-semibold self-start">
              + Add task
            </button>
          </div>
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete template?">
        <p className="text-sm text-text/60 mb-5">
          Delete <span className="font-semibold text-text">{deleteTarget?.name}</span>?
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 h-9 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
