import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Eye, Pencil, Trash2, Search } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useClients } from '../hooks/useClients.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import TagPicker, { TagBadges } from '../components/TagPicker.jsx'
import { useFilterStore } from '../store/filterStore.js'

const STATUS_STYLES = {
  active: 'bg-green-500/10 text-green-400',
  lead: 'bg-primary/10 text-primary',
  inactive: 'bg-white/5 text-text/40',
}

const EMPTY_FORM = {
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'active',
  notes: '',
  tag_ids: [],
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'
}

export default function Clients() {
  const { clients, loading, createClient, updateClient, deleteClient } =
    useClients()
  const { clientFilters, saveClientFilter, deleteClientFilter } = useFilterStore()
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
      )
    })
  }, [clients, search, statusFilter])

  const statusCounts = useMemo(
    () => ({
      all: clients.length,
      active: clients.filter((c) => c.status === 'active').length,
      lead: clients.filter((c) => c.status === 'lead').length,
      inactive: clients.filter((c) => c.status === 'inactive').length,
    }),
    [clients]
  )

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(client) {
    setEditing(client)
    setForm({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      status: client.status || 'active',
      notes: client.notes || '',
      tag_ids: client.tag_ids || [],
    })
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
        tag_ids: form.tag_ids,
      }
      if (editing) {
        await updateClient(editing.id, payload)
        toast.success('Client updated')
      } else {
        await createClient(payload)
        toast.success('Client created')
      }
      setModalOpen(false)
    } catch (err) {
      setError(err.message || 'Speichern fehlgeschlagen')
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClient(deleteTarget.id)
      toast.success('Client deleted')
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.length} clients?`)) return
    try {
      for (const id of selected) await deleteClient(id)
      toast.success(`${selected.length} clients deleted`)
      setSelected([])
    } catch (err) {
      toast.error(err.message)
    }
  }

  function saveCurrentFilter() {
    const name = prompt('Filter name:')
    if (!name) return
    saveClientFilter(name, { search, statusFilter })
    toast.success(`Filter "${name}" saved`)
  }

  function applyFilter(f) {
    setSearch(f.filter.search || '')
    setStatusFilter(f.filter.statusFilter || 'all')
  }

  return (
    <AppLayout title="Clients">
      <div className="flex items-center gap-1 p-1 bg-surface-2 border border-white/[0.06] rounded-xl self-start mb-4">
        {['all', 'active', 'lead', 'inactive'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-medium uppercase tracking-wide transition-colors',
              statusFilter === s ? 'bg-primary/10 text-primary' : 'text-text/50 hover:text-text'
            )}
          >
            {s}
            <span className="text-[10px] text-text/40">{statusCounts[s]}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-text/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button
              onClick={bulkDelete}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.length}
            </button>
          )}
          <button
            onClick={saveCurrentFilter}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-sm text-text/70 hover:bg-white/10"
          >
            Save filter
          </button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Client
          </Button>
        </div>
      </div>
      {clientFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-xs text-text/40 uppercase font-semibold">Saved:</span>
          {clientFilters.map((f) => (
            <div key={f.name} className="inline-flex items-center gap-1">
              <button
                onClick={() => applyFilter(f)}
                className="text-xs px-2 h-7 rounded-md bg-white/5 border border-white/10 text-text/70 hover:text-text"
              >
                {f.name}
              </button>
              <button
                onClick={() => deleteClientFilter(f.name)}
                className="text-xs text-text/30 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-white/[0.06] flex items-center justify-center mb-5">
            <Users className="w-7 h-7 text-text/40" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-text mb-1">
            Noch keine Clients
          </h3>
          <p className="text-sm text-text/50 mb-6">
            Füge deinen ersten Client hinzu
          </p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Client
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-text/50 text-center py-12">
          Keine Treffer für „{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((client) => (
            <div
              key={client.id}
              className={cn(
                'bg-surface-2 rounded-xl border shadow-card p-5 flex flex-col gap-4 transition-colors',
                selected.includes(client.id)
                  ? 'border-primary/40 ring-1 ring-primary/20'
                  : 'border-white/[0.06]'
              )}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selected.includes(client.id)}
                  onChange={() => toggleSelect(client.id)}
                  className="mt-1 accent-primary"
                />
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initials(client.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold tracking-tight text-text truncate">
                      {client.name}
                    </h3>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                        STATUS_STYLES[client.status] || STATUS_STYLES.inactive
                      )}
                    >
                      {client.status}
                    </span>
                  </div>
                  <div className="text-sm text-text/50 truncate">
                    {client.company || '—'}
                  </div>
                  {client.email && (
                    <div className="text-xs text-text/40 truncate mt-0.5">
                      {client.email}
                    </div>
                  )}
                  <div className="mt-2">
                    <TagBadges tagIds={client.tag_ids || []} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <Link
                  to={`/clients/${client.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-text/60 border border-white/[0.06] hover:text-text hover:border-white/15 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Link>
                <button
                  onClick={() => openEdit(client)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-text/60 border border-white/[0.06] hover:text-text hover:border-white/15 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(client)}
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

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Client' : 'New Client'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jane Doe"
            required
          />
          <Input
            label="Firma"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Acme Inc."
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@acme.com"
          />
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+49 ..."
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-11 bg-white/5 border border-white/10 rounded-lg px-3.5 text-sm text-text focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="active">Active</option>
              <option value="lead">Lead</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Notizen</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text/30 focus:border-primary/50 focus:outline-none transition-colors resize-none"
              placeholder="Optional notes..."
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
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Client löschen?"
      >
        <p className="text-sm text-text/60 mb-5">
          Möchtest du{' '}
          <span className="font-semibold text-text">{deleteTarget?.name}</span>{' '}
          wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
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
