import { useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Clock,
  CalendarOff,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { EmployeeHoursReport, LeaveReport } from '../types/report.types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Direction = 'up' | 'down' | 'stable'
type Severity  = 'positive' | 'negative' | 'warning' | 'neutral'

interface Insight {
  id:         string
  title:      string
  detail:     string
  direction:  Direction
  changePct?: number
  severity:   Severity
  icon:       React.ElementType
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 100)
}

function dir(change: number, threshold = 2): Direction {
  if (change >  threshold) return 'up'
  if (change < -threshold) return 'down'
  return 'stable'
}

// ── Insight computation ───────────────────────────────────────────────────────

function computeInsights(
  hours: EmployeeHoursReport | null,
  leave: LeaveReport | null,
): Insight[] {
  const insights: Insight[] = []
  if (!hours) return insights

  // ── Group entries by weekStartDate ─────────────────────────────────────────
  type WeekBucket = { hours: number; employees: Set<string>; dept: Map<string, number> }
  const weekMap = new Map<string, WeekBucket>()

  for (const e of hours.entries) {
    const key = e.weekStartDate ?? 'unknown'
    let b = weekMap.get(key)
    if (!b) {
      b = { hours: 0, employees: new Set(), dept: new Map() }
      weekMap.set(key, b)
    }
    b.hours += e.totalHours
    b.employees.add(e.userId)
    b.dept.set(e.department || 'Unknown', (b.dept.get(e.department || 'Unknown') ?? 0) + e.totalHours)
  }

  const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => b.localeCompare(a))
  const [currWeek, prevWeek] = sortedWeeks

  // ── 1. Hours trend (week-over-week) ────────────────────────────────────────
  if (currWeek && prevWeek) {
    const change    = pct(currWeek[1].hours, prevWeek[1].hours)
    const direction = dir(change)
    insights.push({
      id: 'hours-trend',
      title:
        direction === 'up'
          ? `Productivity up ${change}% vs last week`
          : direction === 'down'
          ? `Productivity down ${Math.abs(change)}% vs last week`
          : 'Productivity is stable week-over-week',
      detail: `${currWeek[1].hours.toFixed(0)}h logged this week vs ${prevWeek[1].hours.toFixed(0)}h last week`,
      direction,
      changePct: Math.abs(change),
      severity:  direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'neutral',
      icon:      Clock,
    })
  } else if (currWeek) {
    insights.push({
      id: 'hours-total',
      title: `${currWeek[1].hours.toFixed(0)} hours logged this period`,
      detail: `Across ${currWeek[1].employees.size} active employee${currWeek[1].employees.size !== 1 ? 's' : ''}`,
      direction: 'stable',
      severity:  'neutral',
      icon:      Clock,
    })
  }

  // ── 2. Active employees trend ──────────────────────────────────────────────
  if (currWeek && prevWeek) {
    const curr = currWeek[1].employees.size
    const prev = prevWeek[1].employees.size
    const diff = curr - prev
    insights.push({
      id: 'active-employees',
      title:
        diff > 0
          ? `${diff} more employee${diff > 1 ? 's' : ''} active this week`
          : diff < 0
          ? `${Math.abs(diff)} fewer employee${Math.abs(diff) > 1 ? 's' : ''} active this week`
          : 'Consistent team engagement this week',
      detail: `${curr} employees logged hours this week vs ${prev} last week`,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      severity:  diff >= 0 ? 'positive' : 'warning',
      icon:      Users,
    })
  }

  // ── 3. Top performing department ──────────────────────────────────────────
  if (currWeek) {
    const depts = Array.from(currWeek[1].dept.entries())
      .filter(([d]) => d !== 'Unknown')
      .sort((a, b) => b[1] - a[1])
    if (depts.length > 1) {
      const [top, second] = depts
      const lead = pct(top[1], second[1])
      insights.push({
        id: 'top-dept',
        title: `${top[0]} leads in hours this week`,
        detail: `${top[1].toFixed(0)}h logged — ${lead}% ahead of ${second[0]} (${second[1].toFixed(0)}h)`,
        direction: 'stable',
        severity:  'positive',
        icon:      Building2,
      })
    } else if (depts.length === 1) {
      insights.push({
        id: 'top-dept',
        title: `${depts[0][0]} team most active this week`,
        detail: `${depts[0][1].toFixed(0)} hours logged`,
        direction: 'stable',
        severity:  'positive',
        icon:      Building2,
      })
    }
  }

  // ── 4. Submission consistency across all weeks in the range ───────────────
  if (sortedWeeks.length >= 2) {
    const allEmployees = new Set(hours.entries.map((e) => e.userId))
    const totalWeeks   = sortedWeeks.length
    const empWeekMap   = new Map<string, Set<string>>()

    for (const e of hours.entries) {
      if (!empWeekMap.has(e.userId)) empWeekMap.set(e.userId, new Set())
      empWeekMap.get(e.userId)!.add(e.weekStartDate ?? '')
    }

    const consistent       = Array.from(allEmployees).filter((id) => (empWeekMap.get(id)?.size ?? 0) >= totalWeeks).length
    const consistencyPct   = allEmployees.size > 0 ? Math.round((consistent / allEmployees.size) * 100) : 0
    const inconsistentCount = allEmployees.size - consistent

    insights.push({
      id: 'consistency',
      title: `${consistencyPct}% timesheet submission consistency`,
      detail:
        inconsistentCount > 0
          ? `${consistent} of ${allEmployees.size} employees logged hours every week — ${inconsistentCount} missed at least one week`
          : `All ${allEmployees.size} employees logged hours consistently across ${totalWeeks} weeks`,
      direction: consistencyPct >= 80 ? 'up' : consistencyPct >= 60 ? 'stable' : 'down',
      changePct: consistencyPct,
      severity:  consistencyPct >= 80 ? 'positive' : consistencyPct >= 60 ? 'warning' : 'negative',
      icon:      CheckCircle2,
    })
  }

  // ── 5. Leave trends ────────────────────────────────────────────────────────
  if (leave && leave.entries.length > 0) {
    const now          = new Date()
    const twoWeeksAgo  = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
    const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28)

    const recent = leave.entries.filter((e) => new Date(e.startDate) >= twoWeeksAgo)
    const prior  = leave.entries.filter(
      (e) => new Date(e.startDate) >= fourWeeksAgo && new Date(e.startDate) < twoWeeksAgo,
    )

    if (recent.length + prior.length > 0) {
      const change    = pct(recent.length, prior.length)
      const direction = dir(change, 10)
      insights.push({
        id: 'leave-trend',
        title:
          direction === 'up'
            ? `Leave requests up ${change}% vs prior 2 weeks`
            : direction === 'down'
            ? `Leave requests down ${Math.abs(change)}% vs prior 2 weeks`
            : 'Leave request volume is steady',
        detail: `${recent.length} request${recent.length !== 1 ? 's' : ''} in last 2 weeks vs ${prior.length} in prior 2 weeks`,
        direction,
        changePct: Math.abs(change),
        severity:  direction === 'up' ? 'warning' : 'positive',
        icon:      CalendarOff,
      })
    }

    // Pending backlog warning
    if (leave.totalPending >= 5) {
      insights.push({
        id: 'pending-leaves',
        title: `${leave.totalPending} leave requests pending approval`,
        detail: 'High pending count may impact team capacity planning',
        direction: 'down',
        severity:  'warning',
        icon:      AlertTriangle,
      })
    }

    // Common leave type
    const typeCount = new Map<string, number>()
    for (const e of leave.entries) {
      typeCount.set(e.leaveType, (typeCount.get(e.leaveType) ?? 0) + 1)
    }
    const topType = Array.from(typeCount.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topType && topType[1] > 1) {
      insights.push({
        id: 'top-leave-type',
        title: `${topType[0]} is the most common leave type`,
        detail: `${topType[1]} requests of this type in the selected period`,
        direction: 'stable',
        severity:  'neutral',
        icon:      CalendarOff,
      })
    }
  }

  return insights
}

// ── Styles lookup ─────────────────────────────────────────────────────────────

const severityCard: Record<Severity, string> = {
  positive: 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10',
  negative: 'border-red-500/30    bg-red-500/5    dark:bg-red-500/10',
  warning:  'border-amber-500/30  bg-amber-500/5  dark:bg-amber-500/10',
  neutral:  'border-border        bg-muted/20',
}

const severityIcon: Record<Severity, string> = {
  positive: 'text-emerald-500',
  negative: 'text-red-500',
  warning:  'text-amber-500',
  neutral:  'text-muted-foreground',
}

const dirColor: Record<Direction, string> = {
  up:     'text-emerald-600 dark:text-emerald-400',
  down:   'text-red-500    dark:text-red-400',
  stable: 'text-amber-600  dark:text-amber-400',
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface TrendInsightsProps {
  hours:      EmployeeHoursReport | null
  leave?:     LeaveReport | null
  title?:     string
  className?: string
}

export function TrendInsights({
  hours,
  leave,
  title = 'Trend Insights',
  className,
}: TrendInsightsProps) {
  const insights = useMemo(
    () => computeInsights(hours, leave ?? null),
    [hours, leave],
  )

  if (!hours || insights.length === 0) return null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid of insight cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((ins) => {
          const Icon      = ins.icon
          const TrendIcon =
            ins.direction === 'up'
              ? TrendingUp
              : ins.direction === 'down'
              ? TrendingDown
              : Minus

          return (
            <div
              key={ins.id}
              className={cn(
                'rounded-xl border p-4 transition-shadow hover:shadow-sm',
                severityCard[ins.severity],
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  <Icon className={cn('h-4 w-4', severityIcon[ins.severity])} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <p className="text-sm font-semibold leading-snug">{ins.title}</p>
                    <TrendIcon className={cn('h-3.5 w-3.5 shrink-0', dirColor[ins.direction])} />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {ins.detail}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
