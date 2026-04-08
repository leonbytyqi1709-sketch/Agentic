import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, Search, FileText, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import Button from '../components/ui/Button.js'
import Modal from '../components/ui/Modal.js'
import InvoiceForm from '../components/InvoiceForm.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import type {
  InvoiceInsert,
  InvoiceItemDraft,
  InvoiceStatus,
  InvoiceWithRelations,
} from '../types'

type IconComponent = ComponentType<{ className?: string }>

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-white/5 text-text/50',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
}

const STATUS_ICONS: Record<InvoiceStatus, IconComponent> = {
  draft: FileText,
  sent: Send,
  paid: CheckCircle2,
  overdue: AlertTriangle,
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0))
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Invoices() {
  const { invoices, loading, createInvoice, updateInvoice, deleteInvoice, generateInvoiceNumber } =
    useInvoices()
  const { clients } = useClients()
  const { projects } = useProjects()
  const [search, setSearch] = useState<string>('')
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InvoiceWithRelations | null>(null)

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

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(inv: InvoiceWithRelations) {
    setEditing(inv)
    setModalOpen(true)
  }

  async function handleSave(payload: InvoiceInsert, items: InvoiceItemDraft[]) {
    if (editing) {
      await updateInvoice(editing.id, payload, items)
      toast.success('Invoice updated')
    } else {
      await createInvoice(payload, items)
      toast.success('Invoice created')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteInvoice(deleteTarget.id)
      toast.success('Invoice deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

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
                const Icon = STATUS_ICONS[inv.status as InvoiceStatus] || FileText
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
                          STATUS_STYLES[inv.status as InvoiceStatus]
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

      <InvoiceForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        clients={clients}
        projects={projects}
        onSave={handleSave}
        generateNumber={generateInvoiceNumber}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete invoice?">
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
