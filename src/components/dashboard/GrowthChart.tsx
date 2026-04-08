import { TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export interface GrowthChartDatum {
  label: string
  clients: number
  projects: number
  revenue: number
}

export interface GrowthChartProps {
  data: GrowthChartDatum[]
}

export default function GrowthChart({ data }: GrowthChartProps) {
  return (
    <div className="lg:col-span-2 bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-text">Growth & Revenue</h3>
          <p className="text-xs text-text/40">Last 6 months</p>
        </div>
        <TrendingUp className="w-4 h-4 text-primary" />
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradClients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E11D48" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#E11D48" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB3B62" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#FB3B62" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(250,250,250,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(250,250,250,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#1A1A1A',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: '#FAFAFA' }}
            />
            <Area type="monotone" dataKey="clients" stroke="#E11D48" strokeWidth={2} fill="url(#gradClients)" />
            <Area type="monotone" dataKey="projects" stroke="#FB3B62" strokeWidth={2} fill="url(#gradProjects)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
