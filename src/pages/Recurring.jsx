import { useState } from 'react'
import { Plus, Repeat, Pencil, Trash2, Power, PowerOff, Calendar } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useRecurringInvoices } from '../hooks/useRecurringInvoices.js'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: 0 }
const EMPTY = {
  name: '',
  client_id: '',
  project_id: '',
  frequency: 'monthly',
  next_run: new Date().toISOString().slice(0, 10),
  tax_rate: 19,
}

function fmtMoney(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n || 0))
}

export default function Recurring() {
  const { recurring, loading, create, update, remove } = useRecurringInvoices()
  const { clients } = useClients()
  const { projects } = useProjects()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setItems([{ ...EMPTY_ITEM }])
    setModalOpen(true)
  }

  function openEdit(r) {
    setEditing(r)
    setForm({
      name: r.name || '',
      client_id: r.client_id || '',
      project_id: r.project_id || '',
      frequency: r.frequency || 'monthly',
      next_run: r.next_run || new Date().toISOString().slice(0, 10),
      tax_rate: r.tax_rate ?? 19,
    })
    setItems(r.items?.length ? r.items : [{ ...EMPTY_ITEM }])
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        project_id: form.project_id || null,
        tax_rate: Number(form.tax_rate || 0),
        items: items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
        })),
      }
      if (editing) {
        await update(editing.id, payload)
        toast.success('Recurring invoice updated')
      } else {
        await create(payload)
        toast.success('Recurring invoice created')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(r) {
    try {
      await update(r.id, { active: !r.active })
      toast.success(r.active ? 'Paused' : 'Activated')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    try {
      await remove(deleteTarget.id)
      toast.success('Deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <AppLayout title="Recurring Invoices">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text/50">
          Automate recurring billing · runs on next login after due date
        </p>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Recurring
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-white/[0.06] flex items-center justify-center mb-5">
            <Repeat className="w-7 h-7 text-text/40" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-text mb-1">No recurring invoices</h3>
          <p className="text-sm text-text/50 mb-6">Set up automatic billing for subscriptions</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Recurring
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurring.map((r) => {
            const total = (r.items || []).reduce(
              (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
              0
            )
            const withTax = total + (total * Number(r.tax_rate || 0)) / 100
            return (
              <div
                key={r.id}
                className={cn(
                  'bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5',
                  !r.active && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold tracking-tight text-text truncate">{r.name}</h3>
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                          r.active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text/40'
                        )}
                      >
                        {r.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="text-sm text-text/50 truncate">
                      {r.clients?.name || 'No client'} · {r.frequency}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-text">{fmtMoney(withTax)}</div>
                    <div className="text-[10px] text-text/40 uppercase">per {r.frequency}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-text/50 mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  Next: {new Date(r.next_run).toLocaleDateString('de-DE')}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={() => toggle(r)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-text/60 border border-white/[0.06] hover:text-text hover:border-white/15 transition-colors"
                  >
                    {r.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    {r.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-text/60 border border-white/[0.06] hover:text-text hover:border-white/15 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-red-400/80 border border-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit Recurring' : 'New Recurring'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Website maintenance"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="">— None —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Project</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <Input
              label="Next run"
              type="date"
              value={form.next_run}
              onChange={(e) => setForm({ ...form, next_run: e.target.value })}
            />
            <Input
              label="Tax %"
              type="number"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text/40 font-medium">Line items</label>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  className="col-span-6 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 outline-none"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                />
                <input
                  type="number"
                  className="col-span-2 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 outline-none"
                  placeholder="Qty"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                />
                <input
                  type="number"
                  className="col-span-3 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 outline-none"
                  placeholder="Unit"
                  value={it.unit_price}
                  onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="col-span-1 h-10 rounded-lg text-text/40 hover:text-red-400 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-xs text-primary hover:text-accent font-semibold self-start">
              + Add line item
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete recurring?">
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
