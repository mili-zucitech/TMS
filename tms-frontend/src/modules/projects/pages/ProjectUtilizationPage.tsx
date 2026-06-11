import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query/react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ListTodo,
  CalendarDays,
  Gauge,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import {
  useGetProjectByIdQuery,
  useGetProjectUtilizationQuery,
  useGetProjectBreakdownQuery,
} from '@/features/projects/projectsApi'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null) return 'N/A'
  return value.toFixed(digits)
}

function pct(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return `${value.toFixed(1)} %`
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: string   // Tailwind text-* colour class
  iconBg?: string   // Tailwind bg-* class
}

function KpiCard({ icon, label, value, sub, accent = 'text-foreground', iconBg = 'bg-muted' }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 leading-none ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  value: number | null   // 0–100 or null
  color?: string         // Tailwind bg-* class
  label?: string
  showValue?: boolean
}

function ProgressBar({ value, color = 'bg-emerald-500', showValue = true }: ProgressBarProps) {
  const clamped = value != null ? Math.min(100, Math.max(0, value)) : 0
  return (
    <div className="w-full">
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value != null ? clamped : 0}%` }}
        />
      </div>
      {showValue && (
        <p className="text-xs text-muted-foreground mt-1 text-right">{pct(value)}</p>
      )}
    </div>
  )
}

const HEALTH_CONFIG = {
  GREEN:  { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'On Track',    icon: <CheckCircle2 className="h-4 w-4" /> },
  YELLOW: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         label: 'Near Limit',  icon: <AlertTriangle className="h-4 w-4" /> },
  RED:    { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 label: 'Over Budget', icon: <AlertCircle className="h-4 w-4" /> },
  N_A:    { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',             label: 'No Estimate', icon: <Gauge className="h-4 w-4" /> },
}

function HealthBadge({ status }: { status: 'GREEN' | 'YELLOW' | 'RED' | 'N_A' }) {
  const cfg = HEALTH_CONFIG[status] ?? HEALTH_CONFIG['N_A']
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart colour palette
// ─────────────────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
]

const UTILIZATION_BAR_COLOR = (pct: number | null) => {
  if (pct == null) return '#94a3b8'
  if (pct > 100)  return '#ef4444'
  if (pct > 90)   return '#f59e0b'
  return '#10b981'
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectUtilizationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)
  const validId = !!projectId && !isNaN(projectId)
  // Use skipToken as the arg when invalid — prevents RTK Query from ever constructing a URL
  const queryArg = validId ? projectId : skipToken

  const {
    data: project,
    isLoading: projectLoading,
  } = useGetProjectByIdQuery(queryArg)

  const {
    data: util,
    isLoading: utilLoading,
    error: utilError,
    refetch: refetchUtil,
  } = useGetProjectUtilizationQuery(queryArg)

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    refetch: refetchBreakdown,
  } = useGetProjectBreakdownQuery(queryArg)

  const loading = projectLoading || utilLoading

  // Redirect after all hooks if the URL contains a non-numeric project ID (e.g. "undefined")
  if (!validId) {
    return <Navigate to="/projects" replace />
  }

  function handleRefresh() {
    void refetchUtil()
    void refetchBreakdown()
  }

  const errorMsg = utilError
    ? ((utilError as { data?: { message?: string } })?.data?.message ?? 'Failed to load utilization data')
    : null

  // Utilization bar colour resolved once
  const utilBarColor = UTILIZATION_BAR_COLOR(util?.utilizationPercentage ?? null)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Back nav ───────────────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {project?.name ?? 'Project'} — Utilization
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Effort tracking & progress dashboard
              </p>
              {util && (
                <div className="mt-2">
                  <HealthBadge status={util.healthStatus} />
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleRefresh}
            disabled={utilLoading || breakdownLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${(utilLoading || breakdownLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {errorMsg && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))
          ) : (
            <>
              <KpiCard
                icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                label="Hours Logged"
                value={`${fmt(util?.totalLoggedHours)} h`}
                accent="text-blue-700 dark:text-blue-400"
              />
              <KpiCard
                icon={<Gauge className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
                iconBg="bg-slate-100 dark:bg-slate-800"
                label="Estimated Hours"
                value={util?.totalEstimatedHours != null ? `${fmt(util.totalEstimatedHours)} h` : 'N/A'}
              />
              <KpiCard
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                label="Completion"
                value={pct(util?.completionPercentage)}
                sub={`${util?.completedTasks ?? 0} / ${util?.totalTasks ?? 0} tasks`}
                accent="text-emerald-700 dark:text-emerald-400"
              />
              <KpiCard
                icon={<AlertTriangle className={`h-5 w-5 ${(util?.remainingHours ?? 0) < 0 ? 'text-red-600' : 'text-amber-600'}`} />}
                iconBg={(util?.remainingHours ?? 0) < 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}
                label="Remaining Hours"
                value={util?.remainingHours != null ? `${fmt(util.remainingHours)} h` : 'N/A'}
                accent={(util?.remainingHours ?? 1) < 0 ? 'text-red-700 dark:text-red-400' : undefined}
                sub={(util?.remainingHours ?? 0) < 0 ? 'Budget exceeded' : undefined}
              />
            </>
          )}
        </div>

        {/* ── Progress section ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Effort utilization */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              Effort Utilization
            </h2>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold" style={{ color: utilBarColor }}>
                    {pct(util?.utilizationPercentage)}
                  </span>
                  <span className="text-xs text-muted-foreground mb-1">
                    {fmt(util?.totalLoggedHours)} h / {util?.totalEstimatedHours != null ? `${fmt(util.totalEstimatedHours)} h` : 'N/A'}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, util?.utilizationPercentage ?? 0)}%`,
                      backgroundColor: utilBarColor,
                    }}
                  />
                </div>
                {(util?.utilizationPercentage ?? 0) > 100 && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Project is {fmt((util!.utilizationPercentage! - 100))} % over estimated budget
                  </p>
                )}
              </>
            )}
          </div>

          {/* Task completion + timeline */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Timeline vs Completion
            </h2>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Task completion</span>
                    <span className="font-medium text-foreground">{pct(util?.completionPercentage)}</span>
                  </div>
                  <ProgressBar value={util?.completionPercentage ?? null} color="bg-emerald-500" showValue={false} />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Time elapsed</span>
                    <span className="font-medium text-foreground">{pct(util?.timeElapsedPercentage)}</span>
                  </div>
                  <ProgressBar value={util?.timeElapsedPercentage ?? null} color="bg-blue-500" showValue={false} />
                </div>
                {util?.timeElapsedPercentage != null && util.completionPercentage != null &&
                  util.timeElapsedPercentage > util.completionPercentage + 10 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Work is behind schedule — {fmt(util.timeElapsedPercentage - util.completionPercentage)} % gap
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Charts ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Hours by user */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Hours by Team Member
            </h2>
            {breakdownLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !breakdown?.hoursByUser?.length ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No time entries logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={breakdown.hoursByUser.map((u) => ({
                    name: u.userName ?? u.userId.slice(0, 8),
                    hours: u.hours,
                  }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" h" />
                  <Tooltip
                    formatter={(v: number) => [`${v} h`, 'Hours']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {breakdown.hoursByUser.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Hours by task */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              Hours by Task
            </h2>
            {breakdownLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !breakdown?.hoursByTask?.length ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No task-linked entries yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={breakdown.hoursByTask.map((t) => ({
                    name: (t.taskTitle ?? `Task ${t.taskId}`).slice(0, 20),
                    hours: t.hours,
                  }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" h" />
                  <Tooltip
                    formatter={(v: number) => [`${v} h`, 'Hours']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {breakdown.hoursByTask.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Weekly trend (full width) ──────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Weekly Effort Trend
          </h2>
          {breakdownLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : !breakdown?.hoursByWeek?.length ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              No weekly data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={breakdown.hoursByWeek}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" h" />
                <Tooltip
                  formatter={(v: number) => [`${v} h`, 'Hours logged']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}
