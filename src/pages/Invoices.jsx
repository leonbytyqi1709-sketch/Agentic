import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, Search, FileText, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useInvoices } from '../hooks/useInvoices.js'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'

const STATUS_STYLES = {
  draft: 'bg-white/5 text-text/50',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
}
const STATUS_ICONS = { draft: FileText, sent: Send, paid: CheckCircle2, overdue: AlertTriangle }

function fmtMoney(n) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0))
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: 0 }

export default function Invoices() {
  const { invoices, loading, createInvoice, updateInvoice, deleteInvoice, generateInvoiceNumber } =
    useInvoices()
  const { clients } = useClients()
  const { projects } = useProjects()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    number: '',
    client_id: '',
    project_id: '',
    status: 'draft',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    tax_rate: 19,
    notes: '',
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(
      (i) =>
        i.number?.toLowerCase().includes(q) ||
        i.clients?.name?.toLowerCase().includes(q) ||
        i.projects?.name?.toLowerCase().includes(q)
    )
  }, [invoices, search])

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
    const paid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.total || 0), 0)
    const outstanding = invoices
      .filter((i) => ['sent', 'overdue'].includes(i.status))
      .reduce((s, i) => s + Number(i.total || 0), 0)
    return { total, paid, outstanding, count: invoices.length }
  }, [invoices])

  async function openCreate() {
    const num = await generateInvoiceNumber()
    setEditing(null)
    setForm({
      number: num,
      client_id: '',
      project_id: '',
      status: 'draft',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      tax_rate: 19,
      notes: '',
    })
    setItems([{ ...EMPTY_ITEM }])
    setModalOpen(true)
  }

  function openEdit(inv) {
    setEditing(inv)
    setForm({
      number: inv.number || '',
      client_id: inv.client_id || '',
      project_id: inv.project_id || '',
      status: inv.status || 'draft',
      issue_date: inv.issue_date || '',
      due_date: inv.due_date || '',
      tax_rate: inv.tax_rate ?? 19,
      notes: inv.notes || '',
    })
    setItems([{ ...EMPTY_ITEM }])
    setModalOpen(true)
  }

  const subtotal = items.reduce(
    (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0
  )
  const taxAmount = (subtotal * Number(form.tax_rate || 0)) / 100
  const total = subtotal + taxAmount

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        number: form.number,
        client_id: form.client_id || null,
        project_id: form.project_id || null,
        status: form.status,
        issue_date: form.issue_date || null,
        due_date: form.due_date || null,
        tax_rate: Number(form.tax_rate || 0),
        notes: form.notes.trim() || null,
      }
      if (editing) {
        await updateInvoice(editing.id, payload, items)
        toast.success('Invoice updated')
      } else {
        await createInvoice(payload, items)
        toast.success('Invoice created')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteInvoice(deleteTarget.id)
      toast.success('Invoice deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const StatIcon = STATUS_ICONS
  const clientProjects = projects.filter(
    (p) => !form.client_id || p.client_id === form.client_id
  )

  return (
    <AppLayout title="Invoices">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="text-xs text-text/40 uppercase font-medium mb-2">Total</div>
          <div className="text-2xl font-bold text-text tracking-tight">{fmtMoney(stats.total)}</div>
          <div className="text-xs text-text/40 mt-1">{stats.count} invoices</div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="text-xs text-text/40 uppercase font-medium mb-2">Paid</div>
          <div className="text-2xl font-bold text-green-400 tracking-tight">{fmtMoney(stats.paid)}</div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="text-xs text-text/40 uppercase font-medium mb-2">Outstanding</div>
          <div className="text-2xl font-bold text-blue-400 tracking-tight">{fmtMoney(stats.outstanding)}</div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5 flex flex-col justify-between">
          <div className="text-xs text-text/40 uppercase font-medium">Quick Action</div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-text/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-white/[0.06] flex items-center justify-center mb-5">
            <FileText className="w-7 h-7 text-text/40" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-text mb-1">No invoices yet</h3>
          <p className="text-sm text-text/50 mb-6">Create your first invoice</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>
      ) : (
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-xs uppercase tracking-wide text-text/40">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Number</th>
                <th className="text-left px-5 py-3 font-medium">Client</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Issued</th>
                <th className="text-left px-5 py-3 font-medium">Due</th>
                <th className="text-right px-5 py-3 font-medium">Total</th>
                <th className="text-right px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const Icon = StatIcon[inv.status] || FileText
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-semibold text-text">{inv.number}</td>
                    <td className="px-5 py-3 text-text/80">
                      {inv.clients?.name || <span className="text-text/30">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                          STATUS_STYLES[inv.status]
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text/60">{fmtDate(inv.issue_date)}</td>
                    <td className="px-5 py-3 text-text/60">{fmtDate(inv.due_date)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-text">{fmtMoney(inv.total)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="w-7 h-7 rounded-md text-text/50 hover:text-text hover:bg-white/5 inline-flex items-center justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEdit(inv)}
                          className="w-7 h-7 rounded-md text-text/50 hover:text-text hover:bg-white/5 inline-flex items-center justify-center"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(inv)}
                          className="w-7 h-7 rounded-md text-text/50 hover:text-red-400 hover:bg-red-500/5 inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit Invoice' : 'New Invoice'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Number"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value, project_id: '' })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
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
              <label className="text-xs text-text/40 font-medium">Project</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="">— No project —</option>
                {clientProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Issue date"
              type="date"
              value={form.issue_date}
              onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
            />
            <Input
              label="Due date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
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
            <div className="flex flex-col gap-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-6 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none"
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
                    placeholder="Unit price"
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="col-span-1 h-10 rounded-lg text-text/40 hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="text-xs text-primary hover:text-accent font-semibold self-start"
            >
              + Add line item
            </button>
          </div>

          <div className="flex flex-col gap-1 bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-sm">
            <div className="flex justify-between text-text/60">
              <span>Subtotal</span>
              <span>{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text/60">
              <span>Tax ({form.tax_rate || 0}%)</span>
              <span>{fmtMoney(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-text pt-1 border-t border-white/[0.04]">
              <span>Total</span>
              <span>{fmtMoney(total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text/30 focus:border-primary/50 focus:outline-none resize-none"
            />
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

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete invoice?"
      >
        <p className="text-sm text-text/60 mb-5">
          Delete <span className="font-semibold text-text">{deleteTarget?.number}</span>?
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
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
