import { useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Receipt, TrendingDown, TrendingUp, CircleDollarSign } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useProjects } from '../hooks/useProjects.js'
import { useClients } from '../hooks/useClients.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'

const CATEGORIES = [
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'travel', label: 'Travel' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_STYLES = {
  software: 'bg-blue-500/10 text-blue-400',
  hardware: 'bg-purple-500/10 text-purple-400',
  travel: 'bg-yellow-500/10 text-yellow-400',
  marketing: 'bg-pink-500/10 text-pink-400',
  office: 'bg-green-500/10 text-green-400',
  other: 'bg-white/5 text-text/50',
}

const EMPTY = {
  description: '',
  amount: '',
  category: 'other',
  date: new Date().toISOString().slice(0, 10),
  project_id: '',
  client_id: '',
  billable: false,
}

function fmtMoney(n) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0))
}

export default function Expenses() {
  const { expenses, loading, total, createExpense, updateExpense, deleteExpense } = useExpenses()
  const { projects } = useProjects()
  const { clients } = useClients()
  const { invoices } = useInvoices()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return expenses
    return expenses.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        e.projects?.name?.toLowerCase().includes(q) ||
        e.clients?.name?.toLowerCase().includes(q)
    )
  }, [expenses, search])

  const stats = useMemo(() => {
    const revenue = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.total || 0), 0)
    const profit = revenue - total
    return { revenue, expenses: total, profit, count: expenses.length }
  }, [invoices, total, expenses.length])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(exp) {
    setEditing(exp)
    setForm({
      description: exp.description || '',
      amount: exp.amount ?? '',
      category: exp.category || 'other',
      date: exp.date || new Date().toISOString().slice(0, 10),
      project_id: exp.project_id || '',
      client_id: exp.client_id || '',
      billable: !!exp.billable,
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        description: form.description.trim(),
        amount: Number(form.amount || 0),
        category: form.category,
        date: form.date || null,
        project_id: form.project_id || null,
        client_id: form.client_id || null,
        billable: form.billable,
      }
      if (editing) {
        await updateExpense(editing.id, payload)
        toast.success('Expense updated')
      } else {
        await createExpense(payload)
        toast.success('Expense added')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteExpense(deleteTarget.id)
      toast.success('Expense deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <AppLayout title="Expenses">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text/40 uppercase font-medium">Revenue</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400 tracking-tight">{fmtMoney(stats.revenue)}</div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text/40 uppercase font-medium">Expenses</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 tracking-tight">{fmtMoney(stats.expenses)}</div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text/40 uppercase font-medium">Profit</span>
            <CircleDollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className={cn('text-2xl font-bold tracking-tight', stats.profit >= 0 ? 'text-text' : 'text-red-400')}>
            {fmtMoney(stats.profit)}
          </div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5 flex flex-col justify-between">
          <div className="text-xs text-text/40 uppercase font-medium">Quick Action</div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-text/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-white/[0.06] flex items-center justify-center mb-5">
            <Receipt className="w-7 h-7 text-text/40" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-text mb-1">No expenses yet</h3>
          <p className="text-sm text-text/50 mb-6">Track your business expenses</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>
      ) : (
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-xs uppercase tracking-wide text-text/40">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Description</th>
                <th className="text-left px-5 py-3 font-medium">Category</th>
                <th className="text-left px-5 py-3 font-medium">Project</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-right px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-text font-medium">
                    {e.description}
                    {e.billable && (
                      <span className="ml-2 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Billable
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                        CATEGORY_STYLES[e.category]
                      )}
                    >
                      {e.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text/60">{e.projects?.name || '—'}</td>
                  <td className="px-5 py-3 text-text/60">
                    {e.date ? new Date(e.date).toLocaleDateString('de-DE') : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-red-400">{fmtMoney(e.amount)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="w-7 h-7 rounded-md text-text/50 hover:text-text hover:bg-white/5 inline-flex items-center justify-center"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(e)}
                        className="w-7 h-7 rounded-md text-text/50 hover:text-red-400 hover:bg-red-500/5 inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? 'Edit Expense' : 'New Expense'}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Adobe Creative Cloud"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="59.99"
              required
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text/40 font-medium">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Project</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text/40 font-medium">Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="h-11 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-text focus:border-primary/50 focus:outline-none"
              >
                <option value="">— None —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-text/80 cursor-pointer">
            <input
              type="checkbox"
              checked={form.billable}
              onChange={(e) => setForm({ ...form, billable: e.target.checked })}
              className="accent-primary"
            />
            Billable to client
          </label>
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete expense?">
        <p className="text-sm text-text/60 mb-5">
          Delete <span className="font-semibold text-text">{deleteTarget?.description}</span>?
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
