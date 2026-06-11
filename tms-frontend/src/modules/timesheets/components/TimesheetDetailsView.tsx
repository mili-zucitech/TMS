import { useMemo, useState } from 'react'
import { Clock, FolderOpen, CheckCircle2, CalendarX2, SunMedium, Zap, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/utils/cn'
import {
  formatShortDate,
  formatDuration,
  calcDurationMinutes,
  format12h,
  splitOvertimeEntries,
} from '../utils/timesheetHelpers'
import { TimesheetStatusBadge } from './TimesheetStatusBadge'
import { StatCard } from '@/components/ui/StatCard'
import type { TimesheetResponse, TimeEntryResponse } from '../types/timesheet.types'
import type { LeaveRequestResponse } from '@/modules/leaves/types/leave.types'
import type { HolidayResponse } from '@/modules/holidays/types/holiday.types'

// ── Description expand/collapse cell ────────────────────────────────────────
function DescriptionCell({ text, className }: { text: string | null; className?: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return <span className={className}>—</span>
  if (text.length <= 55) return <span className={className}>{text}</span>
  return expanded ? (
    <span className={className}>
      {text}{' '}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary text-xs underline underline-offset-2"
      >
        less <ChevronUp className="h-3 w-3" />
      </button>
    </span>
  ) : (
    <span className={className}>
      {text.slice(0, 55)}&hellip;{' '}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary text-xs underline underline-offset-2"
      >
        more <ChevronDown className="h-3 w-3" />
      </button>
    </span>
  )
}

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

  const dayOvertimeMinutes = (date: string) =>
    Math.max(0, dayMinutes(date) - 480)

  return (
    <div className={cn('space-y-6', className)}>
      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Total Hours"
          value={formatDuration(weeklyMinutes)}
          iconClassName="from-emerald-500 to-teal-600 shadow-emerald-500/20"
        />
        <StatCard
          icon={FolderOpen}
          label="Projects"
          value={String(uniqueProjects.length)}
          iconClassName="from-blue-500 to-indigo-600 shadow-blue-500/20"
        />
        <StatCard
          icon={CheckCircle2}
          label="Entries"
          value={String(entries.length)}
          iconClassName="from-amber-500 to-orange-500 shadow-amber-500/20"
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
                  : hasEntries
                  ? 'bg-muted/50'
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
                  {dayOvertimeMinutes(date) > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Zap className="h-3 w-3" />
                      {formatDuration(dayOvertimeMinutes(date))} OT
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Entries */}
            {hasEntries && (() => {
              const { regular: regularEntries, overtime: overtimeEntries } = splitOvertimeEntries(dayEntries)
              const overtimeMins = Math.max(0, mins - 480)
              const renderRow = (e: (typeof dayEntries)[number], isOT: boolean) => (
                <tr key={e.id} className={cn('border-b border-border/30 last:border-0', isOT && 'bg-amber-500/[0.04]')}>
                  <td className="px-4 py-2.5">{projectNames[e.projectId] ?? `#${e.projectId}`}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.taskId ? (taskNames[e.taskId] ?? `#${e.taskId}`) : '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap">{format12h(e.startTime)}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap">{format12h(e.endTime)}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatDuration(e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime))}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[220px]">
                    <DescriptionCell text={e.description} className="text-sm break-words" />
                  </td>
                </tr>
              )
              const renderMobileCard = (e: (typeof dayEntries)[number], isOT: boolean) => (
                <div key={e.id} className={cn('px-4 py-3 space-y-1', isOT && 'bg-amber-500/[0.04]')}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{projectNames[e.projectId] ?? `#${e.projectId}`}</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatDuration(e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono whitespace-nowrap">{format12h(e.startTime)} – {format12h(e.endTime)}</span>
                    {e.taskId && <span>· {taskNames[e.taskId] ?? `Task #${e.taskId}`}</span>}
                  </div>
                  {e.description && (
                    <DescriptionCell text={e.description} className="text-xs text-muted-foreground" />
                  )}
                </div>
              )
              return (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                      <colgroup>
                        <col className="w-[16%]" />
                        <col className="w-[14%]" />
                        <col className="w-[11%]" />
                        <col className="w-[11%]" />
                        <col className="w-[11%]" />
                        <col />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/10">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Project</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Task</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Start</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">End</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Duration</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regularEntries.map((e) => renderRow(e, false))}
                        {overtimeEntries.length > 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-1.5 bg-amber-500/[0.06] border-y border-amber-500/20">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <Zap className="h-3 w-3" />
                                Overtime · {formatDuration(overtimeMins)}
                              </span>
                            </td>
                          </tr>
                        )}
                        {overtimeEntries.map((e) => renderRow(e, true))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-border/40">
                    {regularEntries.map((e) => renderMobileCard(e, false))}
                    {overtimeEntries.length > 0 && (
                      <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/[0.06] border-y border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Zap className="h-3 w-3" />
                        Overtime · {formatDuration(overtimeMins)}
                      </div>
                    )}
                    {overtimeEntries.map((e) => renderMobileCard(e, true))}
                  </div>
                </>
              )
            })()}
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
