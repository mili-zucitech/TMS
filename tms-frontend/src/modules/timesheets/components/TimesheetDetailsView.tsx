import { useMemo } from 'react'
import { Clock, FolderOpen, CheckCircle2, CalendarX2, SunMedium } from 'lucide-react'

import { cn } from '@/utils/cn'
import {
  formatShortDate,
  formatDuration,
  calcDurationMinutes,
  stripSeconds,
} from '../utils/timesheetHelpers'
import { TimesheetStatusBadge } from './TimesheetStatusBadge'
import { StatCard } from '@/components/ui/StatCard'
import type { TimesheetResponse, TimeEntryResponse } from '../types/timesheet.types'
import type { LeaveRequestResponse } from '@/modules/leaves/types/leave.types'
import type { HolidayResponse } from '@/modules/holidays/types/holiday.types'

type DayKind = 'work' | 'weekend' | 'holiday'

interface TimesheetDetailsViewProps {
  timesheet: TimesheetResponse
  entries: TimeEntryResponse[]
  weekDates: string[]               // ["YYYY-MM-DD", ...] Mon–Sun
  projectNames: Record<number, string>
  taskNames: Record<number, string>
  leaveDayMap?: Record<string, LeaveRequestResponse>
  holidayMap?: Record<string, HolidayResponse>
  dayKindMap?: Record<string, DayKind>
  className?: string
}

export function TimesheetDetailsView({
  timesheet,
  entries,
  weekDates,
  projectNames,
  taskNames,
  leaveDayMap = {},
  holidayMap = {},
  dayKindMap = {},
  className,
}: TimesheetDetailsViewProps) {
  // Group entries by date
  const byDate = useMemo(() => {
    const map: Record<string, TimeEntryResponse[]> = {}
    for (const d of weekDates) map[d] = []
    for (const e of entries) {
      if (!map[e.workDate]) map[e.workDate] = []
      map[e.workDate].push(e)
    }
    return map
  }, [entries, weekDates])

  // Total weekly minutes
  const weeklyMinutes = useMemo(
    () =>
      entries.reduce(
        (sum, e) =>
          sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)),
        0,
      ),
    [entries],
  )

  // Count active leave days in this week
  const leaveDaysCount = useMemo(
    () => weekDates.filter((d) => !!leaveDayMap[d]).length,
    [weekDates, leaveDayMap],
  )

  // Unique projects
  const uniqueProjects = useMemo(
    () => [...new Set(entries.map((e) => e.projectId))],
    [entries],
  )

  const dayMinutes = (date: string) =>
    byDate[date].reduce(
      (sum, e) =>
        sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)),
      0,
    )

  return (
    <div className={cn('space-y-6', className)}>
      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Total Hours"
          value={formatDuration(weeklyMinutes)}
        />
        <StatCard
          icon={FolderOpen}
          label="Projects"
          value={String(uniqueProjects.length)}
        />
        <StatCard
          icon={CheckCircle2}
          label="Entries"
          value={String(entries.length)}
        />
        {leaveDaysCount > 0 ? (
          <StatCard
            icon={CalendarX2}
            label="Leave Days"
            value={String(leaveDaysCount)}
            iconClassName="from-violet-500 to-purple-600 shadow-violet-500/20"
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <TimesheetStatusBadge status={timesheet.status} />
          </div>
        )}
      </div>

      {/* ── Day-by-day breakdown ──────────────────────────────────────── */}
      {weekDates.map((date) => {
        const dayEntries = byDate[date] ?? []
        const mins = dayMinutes(date)
        const hasEntries = dayEntries.length > 0
        const leaveForDay = leaveDayMap[date]
        const dayKind = dayKindMap[date] ?? 'work'
        const isNonWorkDay = dayKind === 'weekend' || dayKind === 'holiday'

        return (
          <div
            key={date}
            className={cn(
              'rounded-xl border bg-card overflow-hidden',
              leaveForDay
                ? 'border-violet-300/50 dark:border-violet-800/50'
                : isNonWorkDay && !hasEntries && dayKind === 'weekend'
                ? 'border-slate-300/50 dark:border-slate-700/50'
                : isNonWorkDay && !hasEntries && dayKind === 'holiday'
                ? 'border-rose-300/50 dark:border-rose-800/50'
                : 'border-border',
              isNonWorkDay && !hasEntries && !leaveForDay && 'opacity-60',
            )}
          >
            {/* Day header */}
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3 border-b border-border',
                leaveForDay
                  ? 'bg-violet-500/5'
                  : isNonWorkDay && !hasEntries && dayKind === 'weekend'
                  ? 'bg-slate-500/[0.06] dark:bg-slate-800/30'
                  : isNonWorkDay && !hasEntries && dayKind === 'holiday'
                  ? 'bg-rose-500/[0.06] dark:bg-rose-900/20'
                  : 'bg-muted/30',
              )}
            >
              <div className="flex items-center gap-2">
                <p className={cn('font-semibold text-sm', isNonWorkDay && !hasEntries && !leaveForDay && 'text-muted-foreground')}>
                  {formatShortDate(date)}
                </p>
                {/* Leave badge */}
                {leaveForDay && (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                    leaveForDay.status === 'APPROVED'
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/20'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
                  )}>
                    <CalendarX2 className="h-3 w-3" />
                    {leaveForDay.status === 'APPROVED' ? 'On Leave' : 'Leave Pending'}
                    {leaveForDay.leaveTypeName && (
                      <span className="opacity-70">· {leaveForDay.leaveTypeName}</span>
                    )}
                  </span>
                )}
                {/* Weekend badge */}
                {dayKind === 'weekend' && !leaveForDay && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                    <SunMedium className="h-3 w-3" />
                    Work Off
                  </span>
                )}
                {/* Holiday badge */}
                {dayKind === 'holiday' && !leaveForDay && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <SunMedium className="h-3 w-3" />
                    {holidayMap[date]?.name ?? 'Holiday'}
                  </span>
                )}
                {!hasEntries && !leaveForDay && !isNonWorkDay && (
                  <span className="text-xs text-muted-foreground italic">No entries</span>
                )}
              </div>
              {hasEntries && (
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(mins)}
                </span>
              )}
            </div>

            {/* Entries */}
            {hasEntries && (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/10">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Project</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Task</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Start</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">End</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">Duration</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEntries.map((e) => (
                        <tr key={e.id} className="border-b border-border/30 last:border-0">
                          <td className="px-4 py-2.5">{projectNames[e.projectId] ?? `#${e.projectId}`}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{e.taskId ? (taskNames[e.taskId] ?? `#${e.taskId}`) : '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">{stripSeconds(e.startTime)}</td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">{stripSeconds(e.endTime)}</td>
                          <td className="px-4 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatDuration(e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime))}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{e.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-border/40">
                  {dayEntries.map((e) => (
                    <div key={e.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {projectNames[e.projectId] ?? `#${e.projectId}`}
                        </span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDuration(e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{stripSeconds(e.startTime)} – {stripSeconds(e.endTime)}</span>
                        {e.taskId && <span>· {taskNames[e.taskId] ?? `Task #${e.taskId}`}</span>}
                      </div>
                      {e.description && (
                        <p className="text-xs text-muted-foreground">{e.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* ── Weekly total ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
        <span className="font-semibold text-sm">Total Weekly Hours</span>
        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatDuration(weeklyMinutes)}
        </span>
      </div>

      {/* Rejection reason */}
      {timesheet.rejectionReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-xs font-semibold text-destructive uppercase mb-1">Rejection Reason</p>
          <p className="text-sm">{timesheet.rejectionReason}</p>
        </div>
      )}
    </div>
  )
}

// ── StatCard is now in @/components/ui/StatCard ───────────────────────────────
