import { PieChart as PieChartIcon } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import type { ProjectStatus } from '../../types'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: '#64748b',
  active: '#10B981',
  on_hold: '#F59E0B',
  completed: '#E11D48',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
}

export interface StatusChartDatum {
  name: ProjectStatus | string
  value: number
}

export interface StatusChartProps {
  data: StatusChartDatum[]
}

interface PiePayloadItem {
  name?: string | number
  value?: string | number
  payload?: { fill?: string }
}

interface StatusTooltipProps {
  active?: boolean
  payload?: PiePayloadItem[]
}

function CustomTooltip({ active, payload }: StatusTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  const name = String(entry.name ?? '')
  const label = STATUS_LABELS[name as ProjectStatus] ?? name
  const fill = entry.payload?.fill
  return (
    <div className="glass rounded-xl px-3 py-2 shadow-card-lg">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
          style={{ backgroundColor: fill, color: fill }}
        />
        <span className="text-text/70">{label}</span>
        <span className="text-text font-bold tabular-nums ml-2">{entry.value}</span>
      </div>
    </div>
  )
}

export default function StatusChart({ data }: StatusChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-success/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <PieChartIcon className="w-3.5 h-3.5 text-text/70" />
        </div>
        <h3 className="text-sm font-bold tracking-tight text-text">Project Status</h3>
      </div>
      <p className="text-xs text-text/40 mb-4 ml-9">
        {total > 0 ? `Distribution across ${total} projects` : 'No data yet'}
      </p>

      <div className="relative h-56">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-text/40">
            <PieChartIcon className="w-8 h-8 mb-2 opacity-50" />
            No projects yet
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name as ProjectStatus] || '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center total */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-3xl font-bold text-text tabular-nums leading-none">
                  {total}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-text/40 mt-1 font-semibold">
                  Total
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {data.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/[0.04]">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: STATUS_COLORS[d.name as ProjectStatus],
                  boxShadow: `0 0 8px ${STATUS_COLORS[d.name as ProjectStatus]}60`,
                }}
              />
              <span className="text-[11px] text-text/60 font-medium">
                {STATUS_LABELS[d.name as ProjectStatus] || d.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
