import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

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

export default function PublicInvoice() {
  const { token } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: inv, error: e1 } = await supabase.rpc('get_public_invoice', { token })
        if (e1) throw e1
        const { data: it, error: e2 } = await supabase.rpc('get_public_invoice_items', { token })
        if (e2) throw e2
        if (!inv?.length) {
          setError('Invoice not found')
        } else {
          setInvoice(inv[0])
          setItems(it || [])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text/50">
        Loading...
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text/60">
        <div className="text-center">
          <div className="text-lg font-semibold text-text mb-1">Invoice not available</div>
          <div className="text-sm text-text/50">{error}</div>
        </div>
      </div>
    )
  }

  const accent = invoice.profile_accent || '#E11D48'

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-sm text-text hover:bg-white/10"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
        <div id="invoice-print" className="bg-white text-black rounded-xl p-10 shadow-2xl print:shadow-none print:rounded-none">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: accent }}>
                INVOICE
              </h1>
              <div className="text-sm text-gray-500 mt-1 font-mono">{invoice.number}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold tracking-tight">
                {invoice.profile_company || invoice.profile_name || 'ClientPulse'}
              </div>
              {invoice.profile_address && (
                <div className="text-xs text-gray-500 whitespace-pre-wrap mt-1">
                  {invoice.profile_address}
                </div>
              )}
              {invoice.profile_vat && (
                <div className="text-xs text-gray-500 mt-1">VAT: {invoice.profile_vat}</div>
              )}
              <span
                className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md mt-2 border"
                style={{ borderColor: accent, color: accent }}
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
              <div className="font-bold text-black">{invoice.client_name || '—'}</div>
              {invoice.client_company && <div className="text-gray-600">{invoice.client_company}</div>}
              {invoice.client_email && <div className="text-gray-600">{invoice.client_email}</div>}
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
              <tr className="border-b-2 text-[10px] uppercase tracking-wide text-gray-500" style={{ borderColor: accent }}>
                <th className="text-left py-2 font-semibold">Description</th>
                <th className="text-right py-2 font-semibold">Qty</th>
                <th className="text-right py-2 font-semibold">Unit</th>
                <th className="text-right py-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3">{it.description}</td>
                  <td className="py-3 text-right">{it.quantity}</td>
                  <td className="py-3 text-right">{fmt(it.unit_price)}</td>
                  <td className="py-3 text-right font-semibold">{fmt(it.amount)}</td>
                </tr>
              ))}
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
              <div
                className="flex justify-between py-2 border-t-2 font-bold text-lg mt-1"
                style={{ borderColor: accent }}
              >
                <span>Total</span>
                <span style={{ color: accent }}>{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-10 pt-6 border-t border-gray-200">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Notes</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
          {invoice.profile_footer && (
            <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500 whitespace-pre-wrap text-center">
              {invoice.profile_footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
