import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import type { ProjectStatus } from '../../types'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: '#64748b',
  active: '#22c55e',
  on_hold: '#eab308',
  completed: '#E11D48',
}

export interface StatusChartDatum {
  name: ProjectStatus | string
  value: number
}

export interface StatusChartProps {
  data: StatusChartDatum[]
}

export default function StatusChart({ data }: StatusChartProps) {
  return (
    <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
      <h3 className="text-sm font-semibold tracking-tight text-text mb-1">Project Status</h3>
      <p className="text-xs text-text/40 mb-3">Distribution</p>
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text/40">
            No projects yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name as ProjectStatus] || '#64748b'}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1A1A1A',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: 'rgba(250,250,250,0.6)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
