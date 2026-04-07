import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Printer, CheckCircle2, Send, Link2, Download, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { generateInvoicePDF } from '../lib/pdf.js'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'
import { useInvoices } from '../hooks/useInvoices.js'
import { useProfile } from '../hooks/useProfile.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'

const STATUS_STYLES = {
  draft: 'bg-white/5 text-text/50',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
}

function fmt(n) {
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

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchInvoiceWithItems, updateInvoice } = useInvoices()
  const { profile } = useProfile()
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { invoice, items } = await fetchInvoiceWithItems(id)
      if (cancelled) return
      setInvoice(invoice)
      setItems(items)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function print() {
    window.print()
  }

  function downloadPDF() {
    generateInvoicePDF({ invoice, items, profile })
    toast.success('PDF downloaded')
  }

  function emailToClient() {
    const subject = `Invoice ${invoice.number}`
    const body = `Hi ${invoice.clients?.name || ''},

Please find attached invoice ${invoice.number} for ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.total)}.

${invoice.public_token ? `View online: ${window.location.origin}/i/${invoice.public_token}\n\n` : ''}Due date: ${invoice.due_date || ''}

Thanks,
${profile?.full_name || profile?.company || ''}`
    const mailto = `mailto:${invoice.clients?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  async function generateShareLink() {
    try {
      let token = invoice.public_token
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, '')
        await supabase.from('invoices').update({ public_token: token }).eq('id', invoice.id)
        setInvoice({ ...invoice, public_token: token })
      }
      const url = `${window.location.origin}/i/${token}`
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function setStatus(status) {
    try {
      await updateInvoice(invoice.id, { status })
      setInvoice({ ...invoice, status })
      toast.success(`Marked as ${status}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <AppLayout title="Invoice">
      <div className="mb-6 print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-2 text-sm text-text/50 hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : !invoice ? (
        <div className="text-sm text-text/50">Invoice not found.</div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-end gap-2 print:hidden flex-wrap">
            {invoice.status === 'draft' && (
              <Button variant="secondary" onClick={() => setStatus('sent')}>
                <Send className="w-4 h-4" />
                Mark as sent
              </Button>
            )}
            {invoice.status !== 'paid' && (
              <Button variant="secondary" onClick={() => setStatus('paid')}>
                <CheckCircle2 className="w-4 h-4" />
                Mark as paid
              </Button>
            )}
            <Button variant="secondary" onClick={downloadPDF}>
              <Download className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="secondary" onClick={emailToClient}>
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button variant="secondary" onClick={generateShareLink}>
              <Link2 className="w-4 h-4" />
              Share link
            </Button>
            <Button variant="secondary" onClick={print}>
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>

          <div id="invoice-print" className="bg-white text-black rounded-xl p-10 shadow-card print:shadow-none print:rounded-none">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">INVOICE</h1>
                <div className="text-sm text-gray-500 mt-1 font-mono">{invoice.number}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tracking-tight">
                  {profile?.company || profile?.full_name || 'ClientPulse'}
                </div>
                {profile?.full_name && profile?.company && (
                  <div className="text-sm text-gray-500">{profile.full_name}</div>
                )}
                <span
                  className={cn(
                    'inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md mt-2',
                    STATUS_STYLES[invoice.status] || STATUS_STYLES.draft,
                    'print:border print:border-gray-300'
                  )}
                >
                  {invoice.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Bill to
                </div>
                <div className="font-bold text-black">
                  {invoice.clients?.name || '—'}
                </div>
                {invoice.clients?.company && (
                  <div className="text-gray-600">{invoice.clients.company}</div>
                )}
                {invoice.clients?.email && (
                  <div className="text-gray-600">{invoice.clients.email}</div>
                )}
                {invoice.projects?.name && (
                  <div className="text-gray-500 mt-2 text-xs">
                    Project: {invoice.projects.name}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Dates
                </div>
                <div className="text-gray-700">
                  Issue: <span className="font-semibold text-black">{fmtDate(invoice.issue_date)}</span>
                </div>
                <div className="text-gray-700">
                  Due: <span className="font-semibold text-black">{fmtDate(invoice.due_date)}</span>
                </div>
              </div>
            </div>

            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-black text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="text-left py-2 font-semibold">Description</th>
                  <th className="text-right py-2 font-semibold">Qty</th>
                  <th className="text-right py-2 font-semibold">Unit</th>
                  <th className="text-right py-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-100">
                    <td className="py-3">{it.description}</td>
                    <td className="py-3 text-right">{it.quantity}</td>
                    <td className="py-3 text-right">{fmt(it.unit_price)}</td>
                    <td className="py-3 text-right font-semibold">{fmt(it.amount)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 text-sm">
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Subtotal</span>
                  <span>{fmt(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>{fmt(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-black font-bold text-lg mt-1">
                  <span>Total</span>
                  <span>{fmt(invoice.total)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-10 pt-6 border-t border-gray-200">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">
                  Notes
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
