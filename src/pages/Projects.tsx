import { useState, useMemo } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Plus, Eye, Pencil, Trash2, Search, Calendar, DollarSign } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import Button from '../components/ui/Button.js'
import Input from '../components/ui/Input.js'
import Modal from '../components/ui/Modal.js'
import { useProjects } from '../hooks/useProjects.js'
import { useClients } from '../hooks/useClients.js'
import { toast } from '../store/toastStore.js'
import { undoableDelete } from '../lib/undoDelete.js'
import { cn } from '../lib/cn.js'
import ProjectProgress from '../components/ProjectProgress.js'
import TagPicker, { TagBadges } from '../components/TagPicker.js'
import EmptyState from '../components/ui/EmptyState.js'
import type { ProjectInsert, ProjectStatus, ProjectWithClient } from '../types'

const STATUS_STYLES: Record<ProjectStatus, string> = {
  planning: 'bg-white/5 text-text/50',
  active: 'bg-green-500/10 text-green-400',
  on_hold: 'bg-yellow-500/10 text-yellow-400',
  completed: 'bg-primary/10 text-primary',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

interface ProjectFormState {
  name: string
  description: string
  client_id: string
  status: ProjectStatus
  budget: number | string
  start_date: string
  due_date: string
  tag_ids: string[]
}

const EMPTY_FORM: ProjectFormState = {
  name: '',
  description: '',
  client_id: '',
  status: 'planning',
  budget: '',
  start_date: '',
  due_date: '',
  tag_ids: [],
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function fmtMoney(n: number | null | undefined): string | null {
  if (n == null) return null
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

type StatusFilter = 'all' | ProjectStatus

export default function Projects() {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects()
  const { clients } = useClients()
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editing, setEditing] = useState<ProjectWithClient | null>(null)
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectWithClient | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      if (hiddenIds.includes(p.id)) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      return (
        p.name?.toLowerCase().includes(q) ||
        p.clients?.name?.toLowerCase().includes(q)
      )
    })
  }, [projects, search, statusFilter, hiddenIds])

  const statusCounts = useMemo<Record<StatusFilter, number>>(
    () => ({
      all: projects.length,
      planning: projects.filter((p) => p.status === 'planning').length,
      active: projects.filter((p) => p.status === 'active').length,
      on_hold: projects.filter((p) => p.status === 'on_hold').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    }),
    [projects]
  )

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(project: ProjectWithClient) {
    setEditing(project)
    setForm({
      name: project.name || '',
      description: project.description || '',
      client_id: project.client_id || '',
      status: (project.status as ProjectStatus) || 'planning',
      budget: project.budget ?? '',
      start_date: project.start_date || '',
      due_date: project.due_date || '',
      tag_ids: project.tag_ids || [],
    })
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: ProjectInsert = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        client_id: form.client_id || null,
        status: form.status,
        budget: form.budget === '' ? null : Number(form.budget),
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        tag_ids: form.tag_ids,
      }
      if (editing) {
        await updateProject(editing.id, payload)
        toast.success('Project updated')
      } else {
        await createProject(payload)
        toast.success('Project created')
      }
      setModalOpen(false)
    } catch (err) {
      const msg = (err as Error).message || 'Speichern fehlgeschlagen'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    undoableDelete({
      entityLabel: `Project ${target.name}`,
      onHide: () => setHiddenIds((prev) => [...prev, target.id]),
      onRestore: () => setHiddenIds((prev) => prev.filter((x) => x !== target.id)),
      onCommit: () => deleteProject(target.id),
    })
  }

  const filterTabs: StatusFilter[] = ['all', 'planning', 'active', 'on_hold', 'completed']

  return (
    <AppLayout title="Projects">
      <div className="flex items-center gap-1 p-1 bg-surface-2 border border-white/[0.06] rounded-xl self-start mb-4 overflow-x-auto">
        {filterTabs.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-medium uppercase tracking-wide transition-colors whitespace-nowrap',
              statusFilter === s ? 'bg-primary/10 text-primary' : 'text-text/50 hover:text-text'
            )}
          >
            {s.replace('_', ' ')}
            <span className="text-[10px] text-text/40">{statusCounts[s]}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-text/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none transition-colors"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Noch keine Projekte"
          description="Lege dein erstes Projekt an und verwalte Budgets, Tasks und Deadlines an einem Ort."
          action={
            <Button onClick={openCreate} size="lg">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-sm text-text/50 text-center py-12">
          Keine Treffer für „{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="card card-hover p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-base font-bold tracking-tight text-text truncate">{project.name}</h3>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                        STATUS_STYLES[project.status as ProjectStatus] || STATUS_STYLES.planning
                      )}
                    >
                      {STATUS_LABELS[project.status as ProjectStatus] || project.status}
                    </span>
                  </div>
                  <div className="text-sm text-text/50 truncate">{project.clients?.name || 'No client'}</div>
                  {project.description && (
                    <div className="text-xs text-text/40 line-clamp-2 mt-1.5">{project.description}</div>
                  )}
                  <div className="mt-2">
                    <TagBadges tagIds={project.tag_ids || []} />
                  </div>
                </div>
              </div>
              <ProjectProgress projectId={project.id} />
              <div className="flex items-center gap-4 text-xs text-text/50 flex-wrap">
                {project.budget != null && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    {fmtMoney(project.budget)}
                  </div>
                )}
                {project.due_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {fmtDate(project.due_date)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <Link
                  to={`/projects/${project.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-text/60 border border-white/[0.06] hover:text-text hover:border-white/15 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Link>
                <button
                  onClick={() => openEdit(project)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-text/60 border border-white/[0.06] hover:text-text hover:border-white/15 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(project)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-red-400/80 border border-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Project' : 'New Project'}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Project name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Website Redesign"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Client</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="h-11 bg-white/5 border border-white/10 rounded-lg px-3.5 text-sm text-text focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="">— No client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              className="h-11 bg-white/5 border border-white/10 rounded-lg px-3.5 text-sm text-text focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <Input
            label="Budget (€)"
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            placeholder="5000"
            min="0"
            step="0.01"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
            <Input
              label="Due"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Tags</label>
            <TagPicker value={form.tag_ids} onChange={(ids) => setForm({ ...form, tag_ids: ids })} />
          </div>
          {error && (
            <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Projekt löschen?"
      >
        <p className="text-sm text-text/60 mb-5">
          Möchtest du <span className="font-semibold text-text">{deleteTarget?.name}</span> wirklich löschen?
          Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Abbrechen
          </Button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 h-9 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Lösche...' : 'Löschen'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
