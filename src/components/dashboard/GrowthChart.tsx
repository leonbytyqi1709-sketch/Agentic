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

interface TooltipPayloadItem {
  name?: string | number
  value?: string | number
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2.5 shadow-card-lg">
      <div className="text-[10px] uppercase tracking-widest text-text/40 font-semibold mb-1.5">
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: entry.color, color: entry.color }}
            />
            <span className="text-text/60 capitalize">{entry.name}</span>
            <span className="text-text font-semibold tabular-nums ml-auto">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GrowthChart({ data }: GrowthChartProps) {
  return (
    <div className="lg:col-span-2 card p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-bold tracking-tight text-text">Growth & Revenue</h3>
      </div>
      <p className="text-xs text-text/40 mb-5 ml-9">Last 6 months</p>

      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradClients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E11D48" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#E11D48" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB7185" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#FB7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              stroke="rgba(250,250,250,0.35)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              stroke="rgba(250,250,250,0.35)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: 'rgba(225,29,72,0.3)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />
            <Area
              type="monotone"
              dataKey="clients"
              stroke="#E11D48"
              strokeWidth={2.5}
              fill="url(#gradClients)"
              activeDot={{ r: 5, fill: '#E11D48', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="projects"
              stroke="#FB7185"
              strokeWidth={2.5}
              fill="url(#gradProjects)"
              activeDot={{ r: 5, fill: '#FB7185', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="relative flex items-center gap-5 mt-4 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(225,29,72,0.6)]" />
          <span className="text-xs text-text/70 font-medium">Clients</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-light shadow-[0_0_12px_rgba(251,113,133,0.5)]" />
          <span className="text-xs text-text/70 font-medium">Projects</span>
        </div>
      </div>
    </div>
  )
}
