import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  StickyNote,
  FolderKanban,
  FileText,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn.js'
import Attachments from '../components/Attachments.jsx'
import { TagBadges } from '../components/TagPicker.jsx'

const CLIENT_STATUS_STYLES = {
  active: 'bg-green-500/10 text-green-400',
  lead: 'bg-primary/10 text-primary',
  inactive: 'bg-white/5 text-text/40',
}

const INVOICE_STYLES = {
  draft: 'bg-white/5 text-text/50',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
}

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  )
}

function fmtMoney(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) return
      setLoading(true)
      const [{ data: c }, { data: p }, { data: i }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase
          .from('projects')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setClient(c)
      setProjects(p || [])
      setInvoices(i || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total || 0), 0)
  const outstanding = invoices
    .filter((i) => ['sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + Number(i.total || 0), 0)

  return (
    <AppLayout title="Client">
      <div className="mb-6">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-sm text-text/50 hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-text/50">Loading...</div>
      ) : !client ? (
        <div className="text-sm text-text/50">Client not found.</div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-6">
            <div className="flex items-start gap-5 flex-wrap">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-bold shrink-0">
                {initials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-bold tracking-tight text-text">{client.name}</h2>
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                      CLIENT_STATUS_STYLES[client.status] || CLIENT_STATUS_STYLES.inactive
                    )}
                  >
                    {client.status}
                  </span>
                </div>
                {client.company && <div className="text-sm text-text/50">{client.company}</div>}
                <div className="mt-2">
                  <TagBadges tagIds={client.tag_ids || []} />
                </div>
              </div>
              <Button variant="secondary" onClick={() => navigate('/clients')}>
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              {client.email && (
                <div className="flex items-center gap-3 bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.04]">
                  <Mail className="w-4 h-4 text-text/40" />
                  <span className="text-sm text-text truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.04]">
                  <Phone className="w-4 h-4 text-text/40" />
                  <span className="text-sm text-text truncate">{client.phone}</span>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-3 bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.04]">
                  <Building2 className="w-4 h-4 text-text/40" />
                  <span className="text-sm text-text truncate">{client.company}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-5">
                <div className="flex items-center gap-2 text-xs text-text/40 font-medium uppercase tracking-wide mb-2">
                  <StickyNote className="w-3.5 h-3.5" />
                  Notes
                </div>
                <p className="text-sm text-text/80 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <div className="text-xs text-text/40 uppercase font-medium mb-2">Revenue</div>
              <div className="text-2xl font-bold text-green-400 tracking-tight">{fmtMoney(totalRevenue)}</div>
            </div>
            <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <div className="text-xs text-text/40 uppercase font-medium mb-2">Outstanding</div>
              <div className="text-2xl font-bold text-blue-400 tracking-tight">{fmtMoney(outstanding)}</div>
            </div>
            <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
              <div className="text-xs text-text/40 uppercase font-medium mb-2">Projects</div>
              <div className="text-2xl font-bold text-text tracking-tight">{projects.length}</div>
            </div>
          </div>

          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-text">Projects</h3>
                <p className="text-xs text-text/40">{projects.length} linked</p>
              </div>
              <FolderKanban className="w-4 h-4 text-text/40" />
            </div>
            {projects.length === 0 ? (
              <div className="text-sm text-text/40 py-6 text-center">No projects linked to this client.</div>
            ) : (
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-text/40 truncate">{p.status}</div>
                    </div>
                    <div className="text-xs text-text/50 shrink-0 pl-3">
                      {p.budget != null ? fmtMoney(p.budget) : '—'}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Attachments entityType="client" entityId={client.id} />

          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-text">Invoices</h3>
                <p className="text-xs text-text/40">{invoices.length} total</p>
              </div>
              <FileText className="w-4 h-4 text-text/40" />
            </div>
            {invoices.length === 0 ? (
              <div className="text-sm text-text/40 py-6 text-center">No invoices for this client.</div>
            ) : (
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    to={`/invoices/${inv.id}`}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm font-semibold text-text group-hover:text-primary transition-colors">
                        {inv.number}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                          INVOICE_STYLES[inv.status]
                        )}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-text">{fmtMoney(inv.total)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
