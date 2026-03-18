import { Suspense } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  TooltipProps,
} from 'recharts'
import { cn } from '@/utils/cn'
import type { ChartDataPoint } from '../types/report.types'

// ── Colour palette ────────────────────────────────────────────────────────────
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316',
  '#8b5cf6', '#06b6d4',
]

function getColor(idx: number) {
  return COLORS[idx % COLORS.length]
}

// ── Shared chart wrapper ──────────────────────────────────────────────────────
interface ChartWrapperProps {
  height?: number
  className?: string
  children: React.ReactNode
}

export function ChartWrapper({ height = 300, className, children }: ChartWrapperProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <Suspense fallback={<div className="h-full animate-pulse rounded-lg bg-muted" />}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </Suspense>
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs font-semibold">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{Number(entry.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
interface ReportBarChartProps {
  data: ChartDataPoint[]
  bars: { key: string; label: string; color?: string }[]
  xKey?: string
  height?: number
  className?: string
  stacked?: boolean
}

export function ReportBarChart({
  data,
  bars,
  xKey = 'name',
  height = 300,
  className,
  stacked = false,
}: ReportBarChartProps) {
  return (
    <ChartWrapper height={height} className={className}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground fill-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground fill-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label}
            fill={bar.color ?? getColor(i)}
            radius={[4, 4, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </ChartWrapper>
  )
}

// ── Pie Chart ─────────────────────────────────────────────────────────────────
interface ReportPieChartProps {
  data: ChartDataPoint[]
  height?: number
  className?: string
  innerRadius?: number
  showLegend?: boolean
}

export function ReportPieChart({
  data,
  height = 280,
  className,
  innerRadius = 60,
  showLegend = true,
}: ReportPieChartProps) {
  return (
    <ChartWrapper height={height} className={className}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 50}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={getColor(idx)} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
      </PieChart>
    </ChartWrapper>
  )
}

// ── Line Chart ────────────────────────────────────────────────────────────────
interface ReportLineChartProps {
  data: ChartDataPoint[]
  lines: { key: string; label: string; color?: string }[]
  xKey?: string
  height?: number
  className?: string
}

export function ReportLineChart({
  data,
  lines,
  xKey = 'name',
  height = 300,
  className,
}: ReportLineChartProps) {
  return (
    <ChartWrapper height={height} className={className}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground fill-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          className="text-muted-foreground fill-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color ?? getColor(i)}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ChartWrapper>
  )
}
