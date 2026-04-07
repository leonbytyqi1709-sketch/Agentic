import { useMemo } from 'react'
import {
  BarChart3,
  Download,
  CircleDollarSign,
  Users,
  FolderKanban,
  FileText,
  Clock,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useTimeEntries } from '../hooks/useTimeEntries.js'
import { toCSV, downloadCSV } from '../lib/csv.js'
import { toast } from '../store/toastStore.js'

function fmtMoney(n) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))
}

export default function Reports() {
  const { clients } = useClients()
  const { projects } = useProjects()
  const { invoices } = useInvoices()
  const { entries, totalSeconds } = useTimeEntries()

  const revenueByClient = useMemo(() => {
    const map = {}
    invoices
      .filter((i) => i.status === 'paid')
      .forEach((i) => {
        const name = i.clients?.name || 'Unknown'
        map[name] = (map[name] || 0) + Number(i.total || 0)
      })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [invoices])

  const monthlyRevenue = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (11 - i))
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('de-DE', { month: 'short' }),
        revenue: 0,
      }
    })
    invoices
      .filter((i) => i.status === 'paid')
      .forEach((i) => {
        const d = new Date(i.issue_date || i.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const b = months.find((m) => m.key === key)
        if (b) b.revenue += Number(i.total || 0)
      })
    return months
  }, [invoices])

  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total || 0), 0)
  const avgProjectBudget =
    projects.length > 0
      ? projects.reduce((s, p) => s + Number(p.budget || 0), 0) / projects.length
      : 0

  function exportClients() {
    const csv = toCSV(
      clients.map((c) => ({
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        status: c.status,
        created_at: c.created_at,
      }))
    )
    downloadCSV(`clients-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    toast.success('Clients exported')
  }

  function exportProjects() {
    const csv = toCSV(
      projects.map((p) => ({
        name: p.name,
        client: p.clients?.name || '',
        status: p.status,
        budget: p.budget,
        start_date: p.start_date,
        due_date: p.due_date,
      }))
    )
    downloadCSV(`projects-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    toast.success('Projects exported')
  }

  function exportInvoices() {
    const csv = toCSV(
      invoices.map((i) => ({
        number: i.number,
        client: i.clients?.name || '',
        status: i.status,
        issue_date: i.issue_date,
        due_date: i.due_date,
        subtotal: i.subtotal,
        tax: i.tax_amount,
        total: i.total,
      }))
    )
    downloadCSV(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    toast.success('Invoices exported')
  }

  function exportTime() {
    const csv = toCSV(
      entries.map((e) => ({
        project: e.projects?.name || '',
        description: e.description || '',
        started_at: e.started_at,
        ended_at: e.ended_at,
        hours: ((e.duration_seconds || 0) / 3600).toFixed(2),
      }))
    )
    downloadCSV(`time-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    toast.success('Time entries exported')
  }

  return (
    <AppLayout title="Reports">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text/40 uppercase font-medium">Total Revenue</span>
              <CircleDollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-text tracking-tight">{fmtMoney(totalRevenue)}</div>
            <div className="text-xs text-text/40 mt-1">Paid invoices</div>
          </div>
          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text/40 uppercase font-medium">Avg Budget</span>
              <FolderKanban className="w-4 h-4 text-text/60" />
            </div>
            <div className="text-2xl font-bold text-text tracking-tight">{fmtMoney(avgProjectBudget)}</div>
            <div className="text-xs text-text/40 mt-1">Per project</div>
          </div>
          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text/40 uppercase font-medium">Hours</span>
              <Clock className="w-4 h-4 text-text/60" />
            </div>
            <div className="text-2xl font-bold text-text tracking-tight">
              {(totalSeconds / 3600).toFixed(1)}h
            </div>
            <div className="text-xs text-text/40 mt-1">{entries.length} entries</div>
          </div>
          <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text/40 uppercase font-medium">Active clients</span>
              <Users className="w-4 h-4 text-text/60" />
            </div>
            <div className="text-2xl font-bold text-text tracking-tight">
              {clients.filter((c) => c.status === 'active').length}
            </div>
            <div className="text-xs text-text/40 mt-1">of {clients.length}</div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-text">Monthly Revenue</h3>
              <p className="text-xs text-text/40">Last 12 months · paid invoices</p>
            </div>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(250,250,250,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(250,250,250,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1A1A1A',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmtMoney(v)}
                />
                <Bar dataKey="revenue" fill="#E11D48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <h3 className="text-sm font-semibold tracking-tight text-text mb-1">Top Clients by Revenue</h3>
          <p className="text-xs text-text/40 mb-4">Paid invoices only</p>
          {revenueByClient.length === 0 ? (
            <div className="text-sm text-text/40 py-6 text-center">No paid invoices yet</div>
          ) : (
            <div className="flex flex-col gap-3">
              {revenueByClient.map((r) => {
                const max = revenueByClient[0].value
                const pct = (r.value / max) * 100
                return (
                  <div key={r.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-text/80">{r.name}</span>
                      <span className="font-semibold text-text">{fmtMoney(r.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
          <h3 className="text-sm font-semibold tracking-tight text-text mb-1">Export Data</h3>
          <p className="text-xs text-text/40 mb-4">Download CSV snapshots</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportClients}>
              <Users className="w-4 h-4" />
              Clients
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="secondary" onClick={exportProjects}>
              <FolderKanban className="w-4 h-4" />
              Projects
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="secondary" onClick={exportInvoices}>
              <FileText className="w-4 h-4" />
              Invoices
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="secondary" onClick={exportTime}>
              <Clock className="w-4 h-4" />
              Time
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
