/**
 * CopyWeekDialog
 *
 * Lets the user copy time entries from any previous week into the current
 * DRAFT/REJECTED timesheet.
 *
 * Pre-validates every edge case client-side:
 *   • Leave days in the destination week   → skipped
 *   • Weekends / holidays (toggle to include)
 *   • Project the user is no longer in     → skipped (shows reason)
 *   • Task that no longer exists            → warning (copied as taskNote)
 *   • Overlapping entries already on day   → skipped
 *   • Would exceed 24 h daily limit        → skipped
 *   • Duplicate copy (already copied)      → all entries show as "Time conflict"
 *
 * Entries are created sequentially to avoid partial-state race conditions.
 * A progress bar is shown during the copy operation.
 */

import { useMemo, useState } from 'react'
import { Copy, AlertTriangle, CheckCircle2, XCircle, Clock, Loader2, CalendarX2, SunMedium } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { AppSelect } from '@/components/ui/Select'
import type { SelectOptionGroup } from '@/components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'

import {
  useGetTimesheetsByUserQuery,
  useGetEntriesByTimesheetQuery,
} from '@/features/timesheets/timesheetsApi'

import {
  calcDurationMinutes,
  format12h,
  formatDuration,
  formatMediumDate,
  getWeekStart,
  timesOverlap,
  stripSeconds,
} from '../utils/timesheetHelpers'

import type { TimesheetResponse, TimeEntryResponse, TimeEntryCreateRequest } from '../types/timesheet.types'
import type { LeaveRequestResponse } from '@/modules/leaves/types/leave.types'

// ── Types ─────────────────────────────────────────────────────────────────────

type DayKind = 'work' | 'weekend' | 'holiday'

interface Project { id: number; name: string }
interface Task    { id: number; name: string; projectId: number }

interface CopyWeekDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTimesheet: TimesheetResponse
  userId: string
  /** Current week's dates as "YYYY-MM-DD", Mon→Sun */
  weekDates: string[]
  existingEntries: TimeEntryResponse[]
  leaveDayMap: Record<string, LeaveRequestResponse>
  dayKindMap: Record<string, DayKind>
  projects: Project[]
  tasks: Task[]
  createEntry: (payload: TimeEntryCreateRequest) => Promise<TimeEntryResponse | null>
}

// ── Entry classification ───────────────────────────────────────────────────

type EntryStatus = 'valid' | 'warning' | 'skipped'

interface ClassifiedEntry {
  source: TimeEntryResponse
  targetDate: string
  status: EntryStatus
  reason?: string
  /** Resolved task name used as fallback taskNote when task is missing */
  resolvedTaskNote?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a source entry's workDate to the same weekday in the current week. */
function mapToCurrentWeek(sourceDate: string, currentWeekDates: string[]): string {
  const src = new Date(sourceDate + 'T00:00:00')
  // ISO weekday: Mon=0 … Sun=6
  const weekStart = getWeekStart(src)
  const dayOffset = Math.round(
    (src.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
  )
  return currentWeekDates[dayOffset] ?? currentWeekDates[0]
}

/** Sum minutes already logged on a given date from a list of entries. */
function dailyMinutes(date: string, existing: TimeEntryResponse[]): number {
  return existing
    .filter((e) => e.workDate === date)
    .reduce((sum, e) => sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)), 0)
}

/** Classify all source entries against the current week's constraints. */
function classifyEntries(
  sourceEntries: TimeEntryResponse[],
  currentWeekDates: string[],
  existingEntries: TimeEntryResponse[],
  leaveDayMap: Record<string, LeaveRequestResponse>,
  dayKindMap: Record<string, DayKind>,
  projects: Project[],
  tasks: Task[],
  includeNonWorkDays: boolean,
): ClassifiedEntry[] {
  // Build a mutable snapshot of day-totals so successive entries on the same
  // day are validated against each other, not just against persisted entries.
  const dayTotals: Record<string, number> = {}
  // Also track what time windows are "claimed" (existing + already-valid copies)
  const claimedWindows: Record<string, Array<{ start: string; end: string }>> = {}

  for (const d of currentWeekDates) {
    dayTotals[d] = dailyMinutes(d, existingEntries)
    claimedWindows[d] = existingEntries
      .filter((e) => e.workDate === d)
      .map((e) => ({ start: stripSeconds(e.startTime), end: stripSeconds(e.endTime) }))
  }

  const results: ClassifiedEntry[] = []

  for (const entry of sourceEntries) {
    const targetDate = mapToCurrentWeek(entry.workDate, currentWeekDates)
    const startStr   = stripSeconds(entry.startTime)
    const endStr     = stripSeconds(entry.endTime)
    const duration   = entry.durationMinutes ?? calcDurationMinutes(entry.startTime, entry.endTime)

    // 1. Leave day
    if (leaveDayMap[targetDate]) {
      results.push({ source: entry, targetDate, status: 'skipped', reason: 'Leave day' })
      continue
    }

    // 2. Weekend / holiday
    const kind = dayKindMap[targetDate] ?? 'work'
    if ((kind === 'weekend' || kind === 'holiday') && !includeNonWorkDays) {
      results.push({ source: entry, targetDate, status: 'skipped', reason: 'Non-working day' })
      continue
    }

    // 3. Project availability check
    const projectExists = projects.some((p) => p.id === entry.projectId)
    if (!projectExists) {
      results.push({ source: entry, targetDate, status: 'skipped', reason: 'Project not available' })
      continue
    }

    // 4. Overlap with existing + already-queued-valid entries
    const hasOverlap = (claimedWindows[targetDate] ?? []).some(
      (w) => timesOverlap(startStr, endStr, w.start, w.end),
    )
    if (hasOverlap) {
      results.push({ source: entry, targetDate, status: 'skipped', reason: 'Time conflict' })
      continue
    }

    // 5. Daily 24-hour limit
    if ((dayTotals[targetDate] ?? 0) + duration > 24 * 60) {
      results.push({ source: entry, targetDate, status: 'skipped', reason: 'Would exceed 24 h' })
      continue
    }

    // 6. Task availability — downgrade to warning (copy as taskNote) if missing
    let status: EntryStatus = 'valid'
    let resolvedTaskNote: string | undefined
    if (entry.taskId != null) {
      const taskFound = tasks.some(
        (t) => t.id === entry.taskId && t.projectId === entry.projectId,
      )
      if (!taskFound) {
        status = 'warning'
        // Use the taskNote from the source entry as the fallback, or generic label
        resolvedTaskNote = entry.taskNote ?? `Task #${entry.taskId}`
      }
    }

    // Entry passes — reserve its slot so later entries in the same loop respect it
    dayTotals[targetDate] = (dayTotals[targetDate] ?? 0) + duration
    claimedWindows[targetDate].push({ start: startStr, end: endStr })

    results.push({ source: entry, targetDate, status, resolvedTaskNote })
  }

  return results
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status, reason }: { status: EntryStatus; reason?: string }) {
  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Will copy
      </span>
    )
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Task missing — copied as note
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
      <XCircle className="h-3.5 w-3.5" />
      {reason ?? 'Skipped'}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CopyWeekDialog({
  open,
  onOpenChange,
  currentTimesheet,
  userId,
  weekDates,
  existingEntries,
  leaveDayMap,
  dayKindMap,
  projects,
  tasks,
  createEntry,
}: CopyWeekDialogProps) {
  const [includeNonWorkDays, setIncludeNonWorkDays] = useState(false)
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  // ── All user's timesheets ─────────────────────────────────────────────
  const { data: allTimesheets = [] } = useGetTimesheetsByUserQuery(userId, { skip: !open })

  // Past weeks only (exclude current week and future)
  const sourceWeeks = useMemo(() => {
    const currentStart = currentTimesheet.weekStartDate
    return [...allTimesheets]
      .filter((ts) => ts.weekStartDate < currentStart)
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
  }, [allTimesheets, currentTimesheet.weekStartDate])

  // Group weeks by "Month YYYY" of their start date, newest group first
  const groupedWeekOptions = useMemo((): SelectOptionGroup[] => {
    const groups: Map<string, SelectOptionGroup> = new Map()
    for (const ts of sourceWeeks) {
      const d = new Date(ts.weekStartDate + 'T00:00:00')
      const groupKey = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label: groupKey, options: [] })
      }
      groups.get(groupKey)!.options.push({
        value: ts.id,
        label: `${formatMediumDate(ts.weekStartDate)} – ${formatMediumDate(ts.weekEndDate)}`,
      })
    }
    return Array.from(groups.values())
  }, [sourceWeeks])

  // Default selection to the most recent past week when dialog opens
  const effectiveSelectedId = selectedTimesheetId ?? sourceWeeks[0]?.id ?? null

  // ── Source entries ────────────────────────────────────────────────────
  const { data: sourceEntries = [], isFetching: loadingEntries } = useGetEntriesByTimesheetQuery(
    effectiveSelectedId!,
    { skip: effectiveSelectedId === null },
  )

  // ── Classification ────────────────────────────────────────────────────
  const classified = useMemo(() => {
    if (!sourceEntries.length) return []
    return classifyEntries(
      sourceEntries,
      weekDates,
      existingEntries,
      leaveDayMap,
      dayKindMap,
      projects,
      tasks,
      includeNonWorkDays,
    )
  }, [sourceEntries, weekDates, existingEntries, leaveDayMap, dayKindMap, projects, tasks, includeNonWorkDays])

  const validCount   = classified.filter((e) => e.status === 'valid' || e.status === 'warning').length
  const skippedCount = classified.filter((e) => e.status === 'skipped').length

  const selectedWeek = sourceWeeks.find((ts) => ts.id === effectiveSelectedId)

  // ── Copy handler ──────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!validCount || isCopying) return
    const toCreate = classified.filter((e) => e.status === 'valid' || e.status === 'warning')

    setIsCopying(true)
    setProgress({ done: 0, total: toCreate.length })

    let copied = 0
    let failed = 0

    for (const item of toCreate) {
      const src = item.source
      const payload: TimeEntryCreateRequest = {
        timesheetId: currentTimesheet.id,
        userId,
        projectId:   src.projectId,
        taskId:      item.status === 'warning' ? undefined : (src.taskId ?? undefined),
        taskNote:    item.status === 'warning'
          ? item.resolvedTaskNote ?? src.taskNote ?? undefined
          : src.taskNote ?? undefined,
        workDate:    item.targetDate,
        startTime:   stripSeconds(src.startTime),
        endTime:     stripSeconds(src.endTime),
        description: src.description ?? undefined,
      }

      try {
        const result = await createEntry(payload)
        if (result) copied++
        else failed++
      } catch {
        failed++
      }

      setProgress({ done: copied + failed, total: toCreate.length })
    }

    setIsCopying(false)
    setProgress(null)

    // Toast
    const weekLabel = selectedWeek
      ? `week of ${formatMediumDate(selectedWeek.weekStartDate)}`
      : 'previous week'

    if (copied > 0 && failed === 0) {
      toast.success(`Copied ${copied} ${copied === 1 ? 'entry' : 'entries'} from ${weekLabel}`)
    } else if (copied > 0) {
      toast.warning(`Copied ${copied} entries · ${failed} failed. Check for conflicts.`)
    } else {
      toast.error('No entries could be copied.')
    }

    onOpenChange(false)
  }

  // ── Reset state when dialog closes ───────────────────────────────────
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedTimesheetId(null)
      setIncludeNonWorkDays(false)
      setProgress(null)
    }
    onOpenChange(next)
  }

  // ── Project name lookup ───────────────────────────────────────────────
  const projectNameMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])) as Record<number, string>,
    [projects],
  )

  // Day-of-week label
  function dayLabel(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-primary" />
            Copy Entries from Another Week
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* ── Week selector ──────────────────────────────────────── */}
          {sourceWeeks.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No previous weeks found.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-sm font-medium shrink-0">Copy from</label>
                <AppSelect
                  value={effectiveSelectedId ?? ''}
                  onChange={(v) => setSelectedTimesheetId(Number(v))}
                  options={groupedWeekOptions}
                  className="flex-1"
                  size="sm"
                  isSearchable
                  placeholder="Search or select a week…"
                />
              </div>

              {/* ── Non-work days toggle ──────────────────────────── */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <div
                  role="checkbox"
                  aria-checked={includeNonWorkDays}
                  tabIndex={0}
                  onClick={() => setIncludeNonWorkDays((v) => !v)}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setIncludeNonWorkDays((v) => !v) }}
                  className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer
                    ${includeNonWorkDays ? 'bg-emerald-500' : 'bg-input'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform
                    ${includeNonWorkDays ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-muted-foreground">Include weekends &amp; holidays</span>
              </label>

              {/* ── Entry preview list ────────────────────────────── */}
              {loadingEntries ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading entries…
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Column header */}
                  <div className="grid grid-cols-[1fr_9rem_10rem] items-center gap-x-3 px-4 py-2 bg-muted/60 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Duration</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Status</span>
                  </div>

                  {/* Day groups */}
                  <div className="divide-y divide-border/60 max-h-[28rem] overflow-y-auto">
                    {weekDates.map((date) => {
                      const dayItems = classified.filter((c) => c.targetDate === date)
                      const isLeave = !!leaveDayMap[date]
                      const kind = dayKindMap[date] ?? 'work'
                      const isWeekend = kind === 'weekend'
                      const isHoliday = kind === 'holiday'
                      const isNonWork = isWeekend || isHoliday

                      // Weekends: hide only when there are no entries.
                      // When there are entries, show them (entries will appear as skipped
                      // unless the "include weekends" toggle is on).
                      if (isWeekend && !isLeave && dayItems.length === 0) return null

                      // Work days with no entries and no leave: show "No entries" row
                      const showEmptyState = dayItems.length === 0

                      return (
                        <div key={date} className="border-b border-border/40 last:border-0">
                          {/* Day header row */}
                          <div
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold border-b border-border/30
                              ${
                                isLeave
                                  ? 'bg-violet-500/[0.06] text-violet-700 dark:text-violet-400'
                                  : isNonWork
                                  ? 'bg-slate-500/[0.06] text-muted-foreground'
                                  : 'bg-muted/30 text-muted-foreground'
                              }`}
                          >
                            <span className="font-semibold">{dayLabel(date)}</span>
                            {isLeave && (
                              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/20">
                                <CalendarX2 className="h-3 w-3" />
                                On Leave · Will not copy
                              </span>
                            )}
                            {isWeekend && !isLeave && (
                              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                                <SunMedium className="h-3 w-3" />
                                Weekend
                              </span>
                            )}
                            {isHoliday && !isLeave && (
                              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <SunMedium className="h-3 w-3" />
                                Holiday
                              </span>
                            )}
                          </div>

                          {/* Entries for this day or empty state */}
                          {showEmptyState ? (
                            <div className="px-4 py-2 text-xs text-muted-foreground italic">
                              No entries in source week
                            </div>
                          ) : (
                            dayItems.map((item, i) => {
                              const src = item.source
                              const isDisabled = item.status === 'skipped'
                              const duration = src.durationMinutes ?? calcDurationMinutes(src.startTime, src.endTime)
                              return (
                                <div
                                  key={i}
                                  className={`grid grid-cols-[1fr_9rem_10rem] items-center gap-x-3 px-4 py-2 text-sm
                                    ${isDisabled ? 'opacity-45' : ''}`}
                                >
                                  {/* Project */}
                                  <div className="min-w-0">
                                    <p className="font-medium truncate leading-snug">
                                      {projectNameMap[src.projectId] ?? `#${src.projectId}`}
                                    </p>
                                    {item.status === 'warning' && item.resolvedTaskNote && (
                                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                                        Note: &ldquo;{item.resolvedTaskNote}&rdquo;
                                      </p>
                                    )}
                                  </div>

                                  {/* Time / Duration */}
                                  <div className="text-right shrink-0 tabular-nums">
                                    <p className="font-mono text-xs leading-snug">
                                      {format12h(src.startTime)}–{format12h(src.endTime)}
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-snug flex items-center gap-0.5 justify-end">
                                      <Clock className="h-3 w-3 shrink-0" />
                                      {formatDuration(duration)}
                                    </p>
                                  </div>

                                  {/* Status */}
                                  <div className="shrink-0 flex justify-end">
                                    <StatusBadge status={item.status} reason={item.reason} />
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Summary line ─────────────────────────────────── */}
              {classified.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{validCount}</span>{' '}
                  {validCount === 1 ? 'entry' : 'entries'} will be copied
                  {skippedCount > 0 && (
                    <> · <span className="font-semibold text-foreground">{skippedCount}</span> will be skipped</>
                  )}
                </p>
              )}

              {/* ── Progress bar (during copy) ────────────────────── */}
              {progress && (
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">
                    Copying {progress.done} / {progress.total}…
                  </p>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                      style={{ width: `${(progress.done / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCopying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={validCount === 0 || isCopying || sourceWeeks.length === 0}
            loading={isCopying}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
          >
            <Copy className="h-4 w-4" />
            Copy {validCount > 0 ? `${validCount} ${validCount === 1 ? 'Entry' : 'Entries'}` : 'Entries'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
