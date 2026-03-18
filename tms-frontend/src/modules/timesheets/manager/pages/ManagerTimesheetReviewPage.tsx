import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  CalendarDays,
  MessageSquare,
  FolderOpen,
  SunMedium,
  CalendarX2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { TimesheetStatusBadge } from '../../components/TimesheetStatusBadge'
import { useTimesheetReview } from '../hooks/useManagerTimesheets'
import { useManagerDashboard } from '../hooks/useManagerTimesheets'
import { getHolidaysInRange } from '@/modules/holidays/services/holidayService'
import type { HolidayResponse } from '@/modules/holidays/types/holiday.types'
import { getLeavesByUser } from '@/modules/leaves/services/leaveService'
import type { LeaveRequestResponse } from '@/modules/leaves/types/leave.types'
import {
  formatMediumDate,
  formatDuration,
  formatShortDate,
  calcDurationMinutes,
  stripSeconds,
  getWeekStart,
  getWeekDates,
  toDateString,
} from '../../utils/timesheetHelpers'
import type { TimeEntryResponse } from '../../types/timesheet.types'
import { cn } from '@/utils/cn'

// ────────────────────────────────────────────────────────────────────────────
// Entry detail row (desktop)
// ────────────────────────────────────────────────────────────────────────────
function EntryRow({
  entry,
  projectNames,
  taskNames,
}: {
  entry: TimeEntryResponse
  projectNames: Record<number, string>
  taskNames: Record<number, string>
}) {
  const duration =
    entry.durationMinutes ?? calcDurationMinutes(entry.startTime, entry.endTime)

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2.5 text-sm">{projectNames[entry.projectId] ?? `#${entry.projectId}`}</td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground">
        {entry.taskId
          ? (taskNames[entry.taskId] ?? `#${entry.taskId}`)
          : entry.taskNote
            ? <span className="italic">{entry.taskNote}</span>
            : '—'}
      </td>
      <td className="px-4 py-2.5 text-sm font-mono">{stripSeconds(entry.startTime)}</td>
      <td className="px-4 py-2.5 text-sm font-mono">{stripSeconds(entry.endTime)}</td>
      <td className="px-4 py-2.5 text-center">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(duration)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground max-w-[200px]">
        <span className="truncate block">{entry.description || '—'}</span>
      </td>
    </tr>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Mobile entry card
// ────────────────────────────────────────────────────────────────────────────
function MobileEntryCard({
  entry,
  projectNames,
  taskNames,
}: {
  entry: TimeEntryResponse
  projectNames: Record<number, string>
  taskNames: Record<number, string>
}) {
  const duration =
    entry.durationMinutes ?? calcDurationMinutes(entry.startTime, entry.endTime)
  const taskLabel = entry.taskId
    ? (taskNames[entry.taskId] ?? `#${entry.taskId}`)
    : entry.taskNote ?? '—'

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{projectNames[entry.projectId] ?? `#${entry.projectId}`}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Clock className="h-3 w-3" />
          {formatDuration(duration)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{taskLabel}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono">{stripSeconds(entry.startTime)} – {stripSeconds(entry.endTime)}</span>
      </div>
      {entry.description && (
        <p className="text-xs text-muted-foreground italic">{entry.description}</p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Reject dialog
// ────────────────────────────────────────────────────────────────────────────
function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => void
  isSubmitting: boolean
}) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Rejection reason is required')
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Reject Timesheet
          </DialogTitle>
          <DialogDescription>
            Provide a reason for rejection. The employee will see this message and can
            revise and resubmit their timesheet.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <label className="block text-sm font-medium mb-1.5">
            Rejection Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Missing entries for Tuesday and Wednesday…"
            className={cn(
              'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring',
              'focus:ring-offset-1 resize-none transition-colors',
            )}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? 'Rejecting…' : 'Reject Timesheet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Approve confirm dialog
// ────────────────────────────────────────────────────────────────────────────
function ApproveDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  isSubmitting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            Approve Timesheet
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to approve this timesheet? The employee will be
            notified and the timesheet will be locked for further editing.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Approving…' : 'Approve Timesheet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Review Page
// ────────────────────────────────────────────────────────────────────────────
export default function ManagerTimesheetReviewPage() {
  const { id: rawId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const timesheetId = rawId ? parseInt(rawId, 10) : null

  const { timesheet, entries, totalMinutes, isLoading, error, reload, approve, reject } =
    useTimesheetReview(timesheetId)

  // Load user + project + task name maps from the dashboard hook's allUsers list
  const { allUsers } = useManagerDashboard()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [isActing, setIsActing] = useState(false)

  // ── Holiday data ───────────────────────────────────────────────────
  const [weekHolidays, setWeekHolidays] = useState<HolidayResponse[]>([])

  // ── Leave data ────────────────────────────────────────────────────
  const [employeeLeaves, setEmployeeLeaves] = useState<LeaveRequestResponse[]>([])

  // ── Name maps ──────────────────────────────────────────────────────────
  const employee = useMemo(
    () => allUsers.find((u) => u.id === timesheet?.userId) ?? null,
    [allUsers, timesheet?.userId],
  )

  // For now project/task names come from the entry IDs — we show the ids with
  // a fallback. A richer implementation would load projects/tasks lists.
  const projectNames: Record<number, string> = useMemo(() => ({}), [])
  const taskNames: Record<number, string> = useMemo(() => ({}), [])

  // ── Week dates ─────────────────────────────────────────────────────────
  const weekDates = useMemo(() => {
    if (!timesheet) return []
    const start = getWeekStart(new Date(timesheet.weekStartDate + 'T00:00:00'))
    return getWeekDates(start).map(toDateString)
  }, [timesheet])

  useEffect(() => {
    if (weekDates.length === 0) return
    getHolidaysInRange(weekDates[0], weekDates[weekDates.length - 1])
      .then(setWeekHolidays)
      .catch(() => {})
  }, [weekDates])

  useEffect(() => {
    if (!timesheet?.userId) return
    getLeavesByUser(timesheet.userId)
      .then(setEmployeeLeaves)
      .catch(() => {})
  }, [timesheet?.userId])

  // ── Holiday map ────────────────────────────────────────────────────
  const holidayMap = useMemo(() => {
    const map: Record<string, HolidayResponse> = {}
    for (const h of weekHolidays) map[h.holidayDate] = h
    return map
  }, [weekHolidays])

  // ── Leave day map ──────────────────────────────────────────────────
  const leaveDayMap = useMemo(() => {
    const map: Record<string, LeaveRequestResponse> = {}
    for (const leave of employeeLeaves) {
      if (leave.status === 'CANCELLED' || leave.status === 'REJECTED') continue
      const s = new Date(leave.startDate + 'T00:00:00')
      const e = new Date(leave.endDate + 'T00:00:00')
      const d = new Date(s)
      while (d <= e) {
        map[toDateString(d)] = leave
        d.setDate(d.getDate() + 1)
      }
    }
    return map
  }, [employeeLeaves])

  // ── Day kind map ───────────────────────────────────────────────────
  type DayKind = 'work' | 'weekend' | 'holiday'
  const dayKindMap = useMemo<Record<string, DayKind>>(() => {
    const map: Record<string, DayKind> = {}
    for (const d of weekDates) {
      const dow = new Date(d + 'T00:00:00').getDay()
      if (dow === 0 || dow === 6) { map[d] = 'weekend'; continue }
      if (holidayMap[d]) { map[d] = 'holiday'; continue }
      map[d] = 'work'
    }
    return map
  }, [weekDates, holidayMap])

  // ── Entries grouped by date ────────────────────────────────────────────
  const byDate = useMemo(() => {
    const map: Record<string, TimeEntryResponse[]> = {}
    for (const d of weekDates) map[d] = []
    for (const e of entries) {
      if (!map[e.workDate]) map[e.workDate] = []
      map[e.workDate].push(e)
    }
    return map
  }, [entries, weekDates])

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setIsActing(true)
    const ok = await approve()
    setIsActing(false)
    setApproveOpen(false)
    if (ok) navigate('/timesheets/manager')
  }

  const handleReject = async (reason: string) => {
    setIsActing(true)
    const ok = await reject({ rejectionReason: reason })
    setIsActing(false)
    setRejectOpen(false)
    if (ok) navigate('/timesheets/manager')
  }

  const canAct = timesheet?.status === 'SUBMITTED'

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error || !timesheet) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error ?? 'Timesheet not found.'}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              onClick={() => void reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Back + header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate('/timesheets/manager')}
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Timesheet Review</h1>
              <p className="text-sm text-muted-foreground">
                Week of {formatMediumDate(timesheet.weekStartDate)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => void reload()}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Employee + timesheet meta ──────────────────────────── */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-lg font-bold shadow-md shadow-emerald-500/25">
                {(employee?.name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-lg">{employee?.name ?? `User ${timesheet.userId}`}</p>
                <p className="text-sm text-muted-foreground">
                  {employee?.employeeId} · {employee?.designation ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TimesheetStatusBadge status={timesheet.status} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Week Start</p>
                <p className="text-sm font-medium">{formatMediumDate(timesheet.weekStartDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Week End</p>
                <p className="text-sm font-medium">{formatMediumDate(timesheet.weekEndDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatDuration(totalMinutes)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium">
                  {timesheet.submittedAt
                    ? formatMediumDate(timesheet.submittedAt.split('T')[0])
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Rejection reason (if previously rejected and re-submitted) */}
          {timesheet.rejectionReason && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-400">
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Previous Rejection Reason: </span>
                {timesheet.rejectionReason}
              </div>
            </div>
          )}
        </div>

        {/* ── Approve / Reject action bar ────────────────────────── */}
        {canAct && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Review this timesheet and take action below.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/8 hover:text-destructive"
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                onClick={() => setApproveOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            </div>
          </div>
        )}

        {/* ── Weekly entries ─────────────────────────────────────── */}
        <div className="space-y-3">
          {weekDates.map((date) => {
            const dayEntries = byDate[date] ?? []
            const dayMinutes = dayEntries.reduce(
              (sum, e) =>
                sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)),
              0,
            )
            const dayKind = dayKindMap[date] ?? 'work'
            const isNonWorkDay = dayKind === 'weekend' || dayKind === 'holiday'
            const leaveForDay = leaveDayMap[date]

            return (
              <div
                key={date}
                className={cn(
                  'rounded-xl border bg-card overflow-hidden shadow-sm',
                  leaveForDay
                    ? 'border-violet-300/50 dark:border-violet-800/50'
                    : isNonWorkDay && dayEntries.length === 0 && dayKind === 'weekend'
                    ? 'border-slate-300/50 dark:border-slate-700/50'
                    : isNonWorkDay && dayEntries.length === 0 && dayKind === 'holiday'
                    ? 'border-rose-300/50 dark:border-rose-800/50'
                    : 'border-border',
                )}
              >
                {/* Day header */}
                <div className={cn(
                  'flex items-center justify-between px-4 py-3',
                  leaveForDay
                    ? 'bg-violet-500/5 border-b border-border'
                    : isNonWorkDay && dayEntries.length === 0 && dayKind === 'weekend'
                    ? 'bg-slate-500/[0.06] dark:bg-slate-800/30'
                    : isNonWorkDay && dayEntries.length === 0 && dayKind === 'holiday'
                    ? 'bg-rose-500/[0.06] dark:bg-rose-900/20'
                    : 'bg-muted/30 border-b border-border',
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <p className={cn('font-semibold text-sm shrink-0', isNonWorkDay && dayEntries.length === 0 && !leaveForDay && 'text-muted-foreground')}>
                      {formatShortDate(date)}
                    </p>
                    {/* Leave badge */}
                    {leaveForDay && (
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0',
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
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 shrink-0">
                        <SunMedium className="h-3 w-3" />
                        Work Off
                      </span>
                    )}
                    {/* Holiday badge */}
                    {dayKind === 'holiday' && !leaveForDay && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                        <SunMedium className="h-3 w-3" />
                        {holidayMap[date]?.name ?? 'Holiday'}
                      </span>
                    )}
                  </div>
                  {dayEntries.length > 0 ? (
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(dayMinutes)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {isNonWorkDay ? '' : 'No entries'}
                    </span>
                  )}
                </div>

                {dayEntries.length === 0 ? (
                  leaveForDay ? null
                  : isNonWorkDay ? null : (
                    <p className="px-4 py-3 text-sm text-muted-foreground italic">
                      No time logged for this day.
                    </p>
                  )
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/10">
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-44">Project</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-40">Task</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-24">Check-In</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-24">Check-Out</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase w-24">Hours</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayEntries.map((e) => (
                            <EntryRow
                              key={e.id}
                              entry={e}
                              projectNames={projectNames}
                              taskNames={taskNames}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden p-3 space-y-2">
                      {dayEntries.map((e) => (
                        <MobileEntryCard
                          key={e.id}
                          entry={e}
                          projectNames={projectNames}
                          taskNames={taskNames}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Weekly total ───────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
          <span className="font-semibold text-sm">Total Weekly Hours</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatDuration(totalMinutes)}
          </span>
        </div>

        {/* ── Bottom action bar (repeat for long pages) ──────────── */}
        {canAct && (
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/8 hover:text-destructive"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              Reject Timesheet
            </Button>
            <Button
              className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              onClick={() => setApproveOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Timesheet
            </Button>
          </div>
        )}

        {/* ── Read-only indicator for non-SUBMITTED ─────────────── */}
        {!canAct && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              This timesheet is <strong>{timesheet.status.toLowerCase()}</strong> and
              cannot be acted upon.
            </span>
          </div>
        )}

      </div>

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onConfirm={handleApprove}
        isSubmitting={isActing}
      />
      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        isSubmitting={isActing}
      />
    </div>
  )
}
