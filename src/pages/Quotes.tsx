import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FileSignature,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ArrowRightCircle,
  X,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import Button from '../components/ui/Button.js'
import Modal from '../components/ui/Modal.js'
import EmptyState from '../components/ui/EmptyState.js'
import Badge from '../components/ui/Badge.js'
import { useQuotes } from '../hooks/useQuotes.js'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useProfile } from '../hooks/useProfile.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import { generateQuotePDF } from '../lib/pdf.js'
import type {
  QuoteInsert,
  QuoteItemInsert,
  QuoteStatus,
  QuoteWithRelations,
} from '../types'

const STATUS_ICONS = {
  draft: FileSignature,
  sent: Send,
  accepted: CheckCircle2,
  declined: XCircle,
  expired: Clock,
} as const

const STATUS_TONE: Record<QuoteStatus, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  declined: 'danger',
  expired: 'warning',
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
  return new Date(d).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Quotes() {
  const { quotes, loading, createQuote, updateQuote, deleteQuote, getQuote } = useQuotes()
  const { clients } = useClients()
  const { projects } = useProjects()
  const { createInvoice } = useInvoices()
  const { profile } = useProfile()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<QuoteWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuoteWithRelations | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return quotes
    return quotes.filter(
      (x) =>
        x.number.toLowerCase().includes(q) ||
        x.clients?.name?.toLowerCase().includes(q) ||
        x.projects?.name?.toLowerCase().includes(q)
    )
  }, [quotes, search])

  const stats = useMemo(() => {
    const total = quotes.reduce((s, q) => s + Number(q.total || 0), 0)
    const accepted = quotes
      .filter((q) => q.status === 'accepted')
      .reduce((s, q) => s + Number(q.total || 0), 0)
    const pending = quotes
      .filter((q) => q.status === 'sent' || q.status === 'draft')
      .reduce((s, q) => s + Number(q.total || 0), 0)
    return { total, accepted, pending, count: quotes.length }
  }, [quotes])

  async function handleExportPDF(quote: QuoteWithRelations) {
    try {
      const { quote: full, items } = await getQuote(quote.id)
      generateQuotePDF({ quote: full, items, profile })
      toast.success('PDF downloaded')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleConvertToInvoice(quote: QuoteWithRelations) {
    if (quote.converted_invoice_id) {
      toast.info('Already converted')
      return
    }
    if (!confirm(`Convert quote ${quote.number} to an invoice?`)) return
    try {
      const { items } = await getQuote(quote.id)
      const invoice = await createInvoice(
        {
          client_id: quote.client_id,
          project_id: quote.project_id,
          status: 'draft',
          tax_rate: quote.tax_rate,
          notes: quote.notes || undefined,
          issue_date: new Date().toISOString().slice(0, 10),
        },
        items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      )
      await updateQuote(quote.id, {
        status: 'accepted',
        converted_invoice_id: invoice.id,
      })
      toast.success(`Invoice ${invoice.number} created`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteQuote(deleteTarget.id)
      toast.success('Quote deleted')
      setDeleteTarget(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(q: QuoteWithRelations) {
    setEditing(q)
    setFormOpen(true)
  }

  return (
    <AppLayout title="Quotes">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="text-[10px] text-text/40 uppercase tracking-widest font-bold mb-2">
            Total value
          </div>
          <div className="text-2xl font-bold text-text tracking-tight">
            {fmtMoney(stats.total)}
          </div>
          <div className="text-xs text-text/40 mt-1">{stats.count} quotes</div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="text-[10px] text-text/40 uppercase tracking-widest font-bold mb-2">
            Accepted
          </div>
          <div className="text-2xl font-bold text-success tracking-tight">
            {fmtMoney(stats.accepted)}
          </div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="text-[10px] text-text/40 uppercase tracking-widest font-bold mb-2">
            Pending
          </div>
          <div className="text-2xl font-bold text-info tracking-tight">
            {fmtMoney(stats.pending)}
          </div>
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5 flex flex-col justify-between">
          <div className="text-[10px] text-text/40 uppercase tracking-widest font-bold">
            Quick action
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Quote
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-text/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quotes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading…</div>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No quotes yet"
          description="Create a quote for a client, export it as PDF, and convert it to an invoice when accepted."
          action={
            <Button onClick={openCreate} size="lg">
              <Plus className="w-4 h-4" /> New Quote
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] uppercase tracking-widest text-text/35">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold">Number</th>
                  <th className="text-left px-6 py-4 font-semibold">Client</th>
                  <th className="text-left px-6 py-4 font-semibold">Status</th>
                  <th className="text-left px-6 py-4 font-semibold">Issued</th>
                  <th className="text-left px-6 py-4 font-semibold">Valid Until</th>
                  <th className="text-right px-6 py-4 font-semibold">Total</th>
                  <th className="text-right px-6 py-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => {
                  const Icon = STATUS_ICONS[q.status as QuoteStatus] || FileSignature
                  return (
                    <tr
                      key={q.id}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-text">
                        {q.number}
                        {q.converted_invoice_id && (
                          <span className="ml-2 text-[9px] uppercase tracking-widest font-bold text-success">
                            ↪ Invoice
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-text/80">
                        {q.clients?.name || <span className="text-text/30">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={STATUS_TONE[q.status]} icon={Icon}>
                          {q.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-text/60">{fmtDate(q.issue_date)}</td>
                      <td className="px-6 py-4 text-text/60">{fmtDate(q.valid_until)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-text tabular-nums">
                        {fmtMoney(q.total)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleExportPDF(q)}
                            title="Download PDF"
                            className="w-7 h-7 rounded-md text-text/50 hover:text-primary hover:bg-white/5 inline-flex items-center justify-center"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!q.converted_invoice_id && (
                            <button
                              onClick={() => handleConvertToInvoice(q)}
                              title="Convert to invoice"
                              className="w-7 h-7 rounded-md text-text/50 hover:text-success hover:bg-white/5 inline-flex items-center justify-center"
                            >
                              <ArrowRightCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(q)}
                            className="w-7 h-7 rounded-md text-text/50 hover:text-text hover:bg-white/5 inline-flex items-center justify-center"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(q)}
                            className="w-7 h-7 rounded-md text-text/50 hover:text-danger hover:bg-danger-bg inline-flex items-center justify-center"
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
        </div>
      )}

      {formOpen && (
        <QuoteForm
          editing={editing}
          clients={clients}
          projects={projects}
          loadItems={getQuote}
          onClose={() => setFormOpen(false)}
          onSave={async (payload, items) => {
            try {
              if (editing) {
                await updateQuote(editing.id, payload, items)
                toast.success('Quote updated')
              } else {
                await createQuote(payload, items)
                toast.success('Quote created')
              }
              setFormOpen(false)
            } catch (e) {
              toast.error((e as Error).message)
            }
          }}
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete quote?"
      >
        <p className="text-sm text-text/60 mb-5">
          Delete <span className="font-semibold text-text">{deleteTarget?.number}</span>?
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

// ==============================
// Quote Form
// ==============================

interface QuoteFormProps {
  editing: QuoteWithRelations | null
  clients: { id: string; name: string }[]
  projects: { id: string; name: string; client_id?: string | null }[]
  loadItems: (
    id: string
  ) => Promise<{ quote: QuoteWithRelations; items: { description: string; quantity: number; unit_price: number }[] }>
  onClose: () => void
  onSave: (payload: QuoteInsert, items: QuoteItemInsert[]) => Promise<void>
}

interface DraftItem {
  description: string
  quantity: string
  unit_price: string
}

function QuoteForm({ editing, clients, projects, loadItems, onClose, onSave }: QuoteFormProps) {
  const [clientId, setClientId] = useState(editing?.client_id || '')
  const [projectId, setProjectId] = useState(editing?.project_id || '')
  const [status, setStatus] = useState<QuoteStatus>(editing?.status || 'draft')
  const [issueDate, setIssueDate] = useState(
    editing?.issue_date || new Date().toISOString().slice(0, 10)
  )
  const [validUntil, setValidUntil] = useState(editing?.valid_until || '')
  const [taxRate, setTaxRate] = useState(String(editing?.tax_rate ?? 19))
  const [notes, setNotes] = useState(editing?.notes || '')
  const [items, setItems] = useState<DraftItem[]>([
    { description: '', quantity: '1', unit_price: '0' },
  ])
  const [saving, setSaving] = useState(false)

  // Load items for existing quote
  useEffect(() => {
    if (!editing) return
    loadItems(editing.id).then(({ items: loaded }) => {
      if (loaded.length > 0) {
        setItems(
          loaded.map((it) => ({
            description: it.description,
            quantity: String(it.quantity),
            unit_price: String(it.unit_price),
          }))
        )
      }
    })
  }, [editing, loadItems])

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
      0
    )
    const rate = Number(taxRate || 0)
    const tax = +(subtotal * (rate / 100)).toFixed(2)
    return { subtotal, tax, total: +(subtotal + tax).toFixed(2) }
  }, [items, taxRate])

  function updateItem(idx: number, field: keyof DraftItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: '1', unit_price: '0' }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!clientId) {
      toast.error('Select a client')
      return
    }
    const valid = items.filter((it) => it.description.trim())
    if (valid.length === 0) {
      toast.error('Add at least one item')
      return
    }
    setSaving(true)
    try {
      await onSave(
        {
          client_id: clientId,
          project_id: projectId || null,
          status,
          issue_date: issueDate,
          valid_until: validUntil || null,
          tax_rate: Number(taxRate),
          notes,
        },
        valid.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
        }))
      )
    } finally {
      setSaving(false)
    }
  }

  const visibleProjects = useMemo(
    () => (clientId ? projects.filter((p) => !p.client_id || p.client_id === clientId) : projects),
    [projects, clientId]
  )

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl border border-white/[0.1] shadow-card-lg bg-gradient-to-b from-surface-3 to-surface-2 animate-scale-in overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-bold tracking-tight text-text">
            {editing ? `Edit Quote ${editing.number}` : 'New Quote'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-text/50 hover:text-text hover:bg-white/5 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              >
                <option value="">No project</option>
                {visibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Valid Until
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
                Tax %
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text/50">
                Items
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="flex-1 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    className="w-20 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-right focus:outline-none focus:border-primary/40"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Unit price"
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                    className="w-28 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-right focus:outline-none focus:border-primary/40"
                  />
                  <div className="w-28 h-10 flex items-center justify-end text-sm font-semibold text-text tabular-nums">
                    {fmtMoney(Number(it.quantity || 0) * Number(it.unit_price || 0))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="w-10 h-10 rounded-lg text-text/40 hover:text-danger hover:bg-danger-bg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="ml-auto w-full max-w-xs flex flex-col gap-1 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text/50">Subtotal</span>
              <span className="font-semibold tabular-nums">{fmtMoney(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text/50">Tax ({taxRate}%)</span>
              <span className="font-semibold tabular-nums">{fmtMoney(totals.tax)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold pt-1 mt-1 border-t border-white/[0.06]">
              <span>Total</span>
              <span className="text-primary tabular-nums">{fmtMoney(totals.total)}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-1.5 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm resize-none focus:outline-none focus:border-primary/40"
              placeholder="Optional message to the client…"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Save' : 'Create Quote'}
          </Button>
        </div>
      </form>
    </div>
  )
}
