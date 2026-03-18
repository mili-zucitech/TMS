import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  CalendarX2,
  Clock,
  RefreshCw,
  Send,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Plus,
  SunMedium,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { useAuth } from '@/hooks/useAuth'
import { useTimesheet, useTimeEntries } from '../hooks/useTimesheets'
import timesheetService from '../services/timesheetService'
import { TimesheetStatusBadge } from '../components/TimesheetStatusBadge'
import { TimesheetDetailsView } from '../components/TimesheetDetailsView'
import { TimeEntryRow } from '../components/TimeEntryRow'
import { AddEntryRow } from '../components/AddEntryRow'
import {
  getWeekStart,
  toDateString,
  getWeekDates,
  formatShortDate,
  formatMediumDate,
  formatDuration,
  calcDurationMinutes,
  stripSeconds,
  timesOverlap,
} from '../utils/timesheetHelpers'
import type { ApiResponse } from '@/types/api.types'
import type {
  TimeEntryResponse,
  TimeEntryCreateRequest,
} from '../types/timesheet.types'

import projectService from '@/modules/projects/services/projectService'
import userModuleService from '@/modules/users/services/userService'
import taskService from '@/modules/tasks/services/taskService'
import type { ProjectResponse } from '@/modules/projects/types/project.types'
import type { UserResponse } from '@/modules/users/types/user.types'
import type { TaskResponse } from '@/modules/tasks/types/task.types'
import { TimesheetLeaveModal } from '../components/TimesheetLeaveModal'
import {
  getLeavesByUser,
  getLeaveTypes,
  getLeaveBalance,
} from '@/modules/leaves/services/leaveService'
import type {
  LeaveRequestResponse,
  LeaveTypeResponse,
  LeaveBalanceResponse,
} from '@/modules/leaves/types/leave.types'
import { getHolidaysInRange } from '@/modules/holidays/services/holidayService'
import type { HolidayResponse } from '@/modules/holidays/types/holiday.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

function isEditable(status: string) {
  return status === 'DRAFT' || status === 'REJECTED'
}

export default function TimesheetEntryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const parsed = id ? parseInt(id, 10) : NaN
  const timesheetId = Number.isNaN(parsed) ? null : parsed
  const { timesheet, isLoading: tsLoading, error: tsError, fetchTimesheet, setTimesheet } =
    useTimesheet(timesheetId)
  const { entries, isLoading: entriesLoading, fetchEntries, createEntry, updateEntry, deleteEntry } =
    useTimeEntries(timesheetId)

  // ── Reference data ─────────────────────────────────────────────────────
  const [allProjects, setAllProjects] = useState<ProjectResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    Promise.all([
      projectService.getProjects(0, 200).catch(() => ({ content: [] as ProjectResponse[] })),
      userModuleService.getUsers(0, 200).catch(() => ({ content: [] as UserResponse[] })),
      taskService.getTasks(0, 500).catch(() => ({ content: [] as TaskResponse[] })),
    ]).then(([pPage, uPage, tPage]) => {
      setAllProjects(pPage.content)
      setUsers(uPage.content)
      setTasks(tPage.content)
    })
  }, [])

  const taskNames = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t.title])) as Record<number, string>,
    [tasks],
  )
  const taskList = useMemo(
    () => tasks.map((t) => ({ id: t.id, name: t.title, projectId: t.projectId })),
    [tasks],
  )

  // ── Current user's UUID ─────────────────────────────────────────────────
  const currentUser = useMemo(
    () => users.find((u) => u.email === authUser?.email) ?? null,
    [users, authUser],
  )

  // ── Role-scoped project assignments ────────────────────────────────────
  const [assignedProjectIds, setAssignedProjectIds] = useState<Set<number> | null>(null)

  useEffect(() => {
    if (!currentUser) return
    const role = authUser?.roleName
    if (role === 'EMPLOYEE') {
      projectService.getAssignmentsByUser(currentUser.id)
        .then((assignments) => setAssignedProjectIds(new Set(assignments.map((a) => a.projectId))))
        .catch(() => setAssignedProjectIds(new Set()))
    } else {
      setAssignedProjectIds(null) // no restriction for ADMIN/HR; MANAGER filtered below
    }
  }, [currentUser, authUser?.roleName])

  // ── Filtered project list based on role ────────────────────────────────
  const projects = useMemo(() => {
    const role = authUser?.roleName
    if (role === 'EMPLOYEE') {
      if (assignedProjectIds === null) return [] // still loading
      return allProjects.filter((p) => assignedProjectIds.has(p.id))
    }
    if ((role === 'MANAGER' || role === 'HR_MANAGER') && currentUser) {
      return allProjects.filter((p) => p.projectManagerId === currentUser.id)
    }
    return allProjects // ADMIN / HR / DIRECTOR see everything
  }, [allProjects, authUser?.roleName, currentUser, assignedProjectIds])

  const projectNames = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])) as Record<number, string>,
    [projects],
  )

  // ── Week dates ────────────────────────────────────────────────────────
  const weekDates = useMemo(() => {
    if (!timesheet) return []
    const start = getWeekStart(new Date(timesheet.weekStartDate + 'T00:00:00'))
    return getWeekDates(start).map((d) => toDateString(d))
  }, [timesheet])

  // ── Entries grouped by date ─────────────────────────────────────────
  const entriesByDate = useMemo(() => {
    const map: Record<string, typeof entries> = {}
    for (const d of weekDates) map[d] = []
    for (const e of entries) {
      if (!map[e.workDate]) map[e.workDate] = []
      map[e.workDate].push(e)
    }
    return map
  }, [entries, weekDates])

  // ── Weekly hour totals ──────────────────────────────────────────────
  const weeklyMinutes = useMemo(
    () =>
      entries.reduce(
        (sum, e) =>
          sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)),
        0,
      ),
    [entries],
  )

  // ── Leave integration ───────────────────────────────────────────────
  const [weekLeaves, setWeekLeaves] = useState<LeaveRequestResponse[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeResponse[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceResponse[]>([])
  const [leaveModalDate, setLeaveModalDate] = useState<string>('')
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)

  // ── Holiday integration ─────────────────────────────────────────────
  const [weekHolidays, setWeekHolidays] = useState<HolidayResponse[]>([])

  // ── Weekend / holiday override (user chose to log hours anyway) ────
  const [overriddenDays, setOverriddenDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    const uid = authUser?.userId
    if (!uid) return
    void Promise.all([
      getLeavesByUser(uid).then(setWeekLeaves).catch(() => {}),
      getLeaveTypes().then(setLeaveTypes).catch(() => {}),
      getLeaveBalance(uid).then(setLeaveBalances).catch(() => {}),
    ])
  }, [authUser?.userId])

  // Fetch holidays for the week once dates are known
  useEffect(() => {
    if (weekDates.length === 0) return
    getHolidaysInRange(weekDates[0], weekDates[weekDates.length - 1])
      .then(setWeekHolidays)
      .catch(() => {})
  }, [weekDates])

  // Map each date that is covered by an active (non-cancelled/rejected) leave
  const leaveDayMap = useMemo(() => {
    const map: Record<string, LeaveRequestResponse> = {}
    for (const leave of weekLeaves) {
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
  }, [weekLeaves])

  // Holiday map — date -> HolidayResponse
  const holidayMap = useMemo(() => {
    const map: Record<string, HolidayResponse> = {}
    for (const h of weekHolidays) map[h.holidayDate] = h
    return map
  }, [weekHolidays])

  // Classify each date: 'leave' > 'holiday' > 'weekend' > 'work'
  // (leave check stays separate so it can render its own badge)
  type DayKind = 'work' | 'weekend' | 'holiday'
  const dayKindMap = useMemo<Record<string, DayKind>>(() => {
    const map: Record<string, DayKind> = {}
    for (const d of weekDates) {
      const dow = new Date(d + 'T00:00:00').getDay() // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) { map[d] = 'weekend'; continue }
      if (holidayMap[d]) { map[d] = 'holiday'; continue }
      map[d] = 'work'
    }
    return map
  }, [weekDates, holidayMap])

  // Flat set of dates that have at least one time entry — used for conflict detection
  const datesWithEntries = useMemo(
    () => new Set(entries.map((e) => e.workDate)),
    [entries],
  )

  const handleLeaveSuccess = (leave: LeaveRequestResponse) => {
    setWeekLeaves((prev) => [...prev.filter((l) => l.id !== leave.id), leave])
    setLeaveModalOpen(false)
  }

  const handleDeleteEntriesForDates = async (dates: string[]) => {
    const toDelete = entries.filter((e) => dates.includes(e.workDate))
    if (toDelete.length === 0) return
    await Promise.all(toDelete.map((e) => timesheetService.deleteTimeEntry(e.id)))
    await fetchEntries()
  }

  // ── Submit dialog ───────────────────────────────────────────────────
  const [submitOpen, setSubmitOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!timesheetId) return

    // Final client-side overlap validation across all days
    for (const date of weekDates) {
      const dayEntries = entriesByDate[date] ?? []
      for (let i = 0; i < dayEntries.length; i++) {
        for (let j = i + 1; j < dayEntries.length; j++) {
          const a = dayEntries[i]
          const b = dayEntries[j]
          if (timesOverlap(stripSeconds(a.startTime), stripSeconds(a.endTime),
                           stripSeconds(b.startTime), stripSeconds(b.endTime))) {
            toast.error(`Overlapping entries on ${formatShortDate(date)}. Please fix before submitting.`)
            setSubmitOpen(false)
            return
          }
        }
      }
    }

    setIsSubmitting(true)
    try {
      const updated = await timesheetService.submitTimesheet(timesheetId)
      toast.success('Timesheet submitted successfully!')
      setTimesheet(updated)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit timesheet'))
    } finally {
      setIsSubmitting(false)
      setSubmitOpen(false)
    }
  }

  const canEdit = timesheet ? isEditable(timesheet.status) : false
  const canSubmit = canEdit && entries.length > 0

  const isLoading = tsLoading || entriesLoading

  // ── Loading ─────────────────────────────────────────────────────────
  if (tsLoading && !timesheet) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="h-8 w-36 animate-pulse rounded bg-muted" />
          <div className="rounded-xl border border-border p-6 space-y-4">
            <div className="h-6 w-52 animate-pulse rounded bg-muted" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────
  if (tsError || !timesheet) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/timesheets')}
            className="mb-6 gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Timesheets
          </Button>
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{tsError ?? 'Timesheet not found'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Back nav ─────────────────────────────────────────────── */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/timesheets')}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Timesheets
        </Button>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Week of {formatMediumDate(timesheet.weekStartDate)} – {formatMediumDate(timesheet.weekEndDate)}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <TimesheetStatusBadge status={timesheet.status} />
                {weeklyMinutes > 0 && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(weeklyMinutes)} total
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9"
              onClick={() => { void fetchTimesheet(); void fetchEntries() }}
              disabled={isLoading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {canSubmit && (
              <Button
                onClick={() => setSubmitOpen(true)}
                className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
              >
                <Send className="h-4 w-4" />
                Submit Timesheet
              </Button>
            )}
          </div>
        </div>

        {/* ── Rejection banner ─────────────────────────────────────── */}
        {timesheet.status === 'REJECTED' && timesheet.rejectionReason && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Timesheet Rejected</p>
              <p className="text-destructive/80 mt-0.5">{timesheet.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* ── Read-only view for submitted/approved/locked ──────────── */}
        {!canEdit ? (
          <TimesheetDetailsView
            timesheet={timesheet}
            entries={entries}
            weekDates={weekDates}
            projectNames={projectNames}
            taskNames={taskNames}
            leaveDayMap={leaveDayMap}
            holidayMap={holidayMap}
            dayKindMap={dayKindMap}
          />
        ) : (
          /* ── Editable weekly grid ─────────────────────────── */
          <div className="space-y-3">
            {weekDates.map((date) => {
              const dayEntries = entriesByDate[date] ?? []
              const dayMinutes = dayEntries.reduce(
                (sum, e) =>
                  sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)),
                0,
              )

              const leaveForDay = leaveDayMap[date]
              const dayKind = dayKindMap[date] ?? 'work'
              const isOverridden = overriddenDays.has(date)
              // A day is "collapsed" (work-off / holiday) when it's weekend/holiday AND not overridden
              const isCollapsed = (dayKind === 'weekend' || dayKind === 'holiday') && !isOverridden

              return (
                <div
                  key={date}
                  className={cn(
                    'rounded-xl border bg-card overflow-hidden',
                    isCollapsed && dayKind === 'weekend' ? 'border-slate-300/50 dark:border-slate-700/50' :
                    isCollapsed && dayKind === 'holiday'  ? 'border-rose-300/50  dark:border-rose-800/50'  :
                    'border-border',
                  )}
                >
                  {/* Day header */}
                  <div className={cn(
                    'flex items-center justify-between px-4 py-3',
                    // collapsed rows: tinted header only, no bottom border
                    isCollapsed && dayKind === 'weekend'
                      ? 'bg-slate-500/[0.06] dark:bg-slate-800/30'
                      : isCollapsed && dayKind === 'holiday'
                      ? 'bg-rose-500/[0.06] dark:bg-rose-900/20'
                      : leaveForDay
                      ? 'bg-violet-500/5 border-b border-border'
                      : 'bg-muted/30 border-b border-border',
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={cn('font-semibold text-sm shrink-0', isCollapsed && 'text-muted-foreground')}>
                        {formatShortDate(date)}
                      </p>
                      {/* Weekend or Holiday badge */}
                      {dayKind === 'weekend' && !leaveForDay && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 shrink-0">
                          <SunMedium className="h-3 w-3" />
                          Work Off
                        </span>
                      )}
                      {dayKind === 'holiday' && !leaveForDay && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                          <SunMedium className="h-3 w-3" />
                          {holidayMap[date]?.name ?? 'Holiday'}
                        </span>
                      )}
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
                    </div>

                    {/* Right-side action row — all buttons on the same line */}
                    <div className="flex items-center gap-1 shrink-0">
                      {dayEntries.length > 0 && !leaveForDay && (
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mr-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(dayMinutes)}
                        </span>
                      )}

                      {canEdit && (
                        <>
                          {/* Log Hours — shown on collapsed weekend/holiday days */}
                          {isCollapsed && !leaveForDay && (
                            <button
                              onClick={() => setOverriddenDays((prev) => new Set([...prev, date]))}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors rounded-md px-2 py-1 hover:bg-primary/5"
                              title="Log hours for this day"
                            >
                              <Briefcase className="h-3.5 w-3.5" />
                              <span>Log Hours</span>
                            </button>
                          )}

                          {/* Collapse — shown when overridden and empty */}
                          {isOverridden && !leaveForDay && dayEntries.length === 0 && (
                            <button
                              onClick={() =>
                                setOverriddenDays((prev) => { const s = new Set(prev); s.delete(date); return s })
                              }
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-muted"
                              title="Collapse day"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Collapse</span>
                            </button>
                          )}

                          {/* Apply Leave — shown on all non-collapsed, non-leave days */}
                          {!leaveForDay && !isCollapsed && (
                            <>
                              {/* Separator when Log Hours and Leave are both absent — keeps height stable */}
                              {(dayKind === 'work' || isOverridden) && (
                                <div className="hidden sm:block w-px h-4 bg-border mx-1" />
                              )}
                              <button
                                onClick={() => { setLeaveModalDate(date); setLeaveModalOpen(true) }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors rounded-md px-2 py-1 hover:bg-primary/5"
                                title="Apply leave for this day"
                                aria-label={`Apply leave for ${formatShortDate(date)}`}
                              >
                                <CalendarX2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Leave</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Desktop table — hidden when collapsed */}
                  {!isCollapsed && (
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      {dayEntries.length > 0 && (
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/10">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-44">Project</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-36">Task</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-28">Start</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-28">End</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase w-24">Duration</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                            <th className="px-3 py-2 w-20" />
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {dayEntries.map((entry) => (
                          <TimeEntryRow
                            key={entry.id}
                            entry={entry}
                            allDayEntries={dayEntries}
                            projectNames={projectNames}
                            taskNames={taskNames}
                            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                            tasks={taskList}
                            isEditable={canEdit && !leaveForDay}
                            onUpdate={updateEntry}
                            onDelete={deleteEntry}
                          />
                        ))}
                        {/* Add entry row — hidden when day is on leave */}
                        {currentUser && !leaveForDay && (
                          <AddEntryRow
                            workDate={date}
                            timesheetId={timesheet.id}
                            userId={currentUser.id}
                            existingEntries={dayEntries}
                            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                            tasks={taskList}
                            onSave={createEntry}
                          />
                        )}
                      </tbody>
                    </table>
                  </div>
                  )}

                  {/* Mobile stacked layout — hidden when collapsed */}
                  {!isCollapsed && (
                  <div className="sm:hidden divide-y divide-border/40">
                    {dayEntries.length === 0 && !leaveForDay && (
                      <p className="px-4 py-3 text-sm text-muted-foreground italic">No entries</p>
                    )}
                    {dayEntries.map((e) => (
                      <MobileEntryCard
                        key={e.id}
                        entry={e}
                        projectNames={projectNames}
                        taskNames={taskNames}
                        onDelete={canEdit ? deleteEntry : undefined}
                        onEdit={canEdit ? () => {} : undefined}
                      />
                    ))}
                    {currentUser && canEdit && !leaveForDay && (
                      <div className="px-4 py-3">
                        <MobileAddEntry
                          workDate={date}
                          timesheetId={timesheet.id}
                          userId={currentUser.id}
                          existingEntries={dayEntries}
                          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                          onSave={createEntry}
                        />
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )
            })}

            {/* ── Weekly total bar ──────────────────────────────── */}
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
              <span className="font-semibold text-sm">Total Weekly Hours</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatDuration(weeklyMinutes)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Leave application modal ───────────────────────────────── */}
      {authUser?.userId && leaveModalDate && (
        <TimesheetLeaveModal
          open={leaveModalOpen}
          defaultDate={leaveModalDate}
          userId={authUser.userId}
          leaveTypes={leaveTypes}
          balances={leaveBalances}
          existingLeaves={weekLeaves}
          datesWithEntries={datesWithEntries}
          onClose={() => setLeaveModalOpen(false)}
          onSuccess={handleLeaveSuccess}
          onDeleteEntriesForDates={handleDeleteEntriesForDates}
        />
      )}

      {/* ── Submit confirmation dialog ────────────────────────────── */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 mb-1">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <DialogTitle>Submit Timesheet</DialogTitle>
            <DialogDescription>
              You are about to submit your timesheet for the week of{' '}
              <span className="font-semibold text-foreground">
                {formatMediumDate(timesheet.weekStartDate)} – {formatMediumDate(timesheet.weekEndDate)}
              </span>
              . Total: <span className="font-semibold text-emerald-600">{formatDuration(weeklyMinutes)}</span>.
              <br />
              <br />
              Once submitted, you cannot edit it until it is rejected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              loading={isSubmitting}
              onClick={handleSubmit}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Mobile entry card ──────────────────────────────────────────────────────────
function MobileEntryCard({
  entry,
  projectNames,
  taskNames,
  onDelete,
}: {
  entry: TimeEntryResponse
  projectNames: Record<number, string>
  taskNames: Record<number, string>
  onDelete?: (id: number) => Promise<boolean>
  onEdit?: () => void
}) {
  const duration =
    entry.durationMinutes ?? calcDurationMinutes(entry.startTime, entry.endTime)

  return (
    <div className="px-4 py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{projectNames[entry.projectId] ?? `#${entry.projectId}`}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatDuration(duration)}
          </span>
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(entry.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          {stripSeconds(entry.startTime)} – {stripSeconds(entry.endTime)}
        </span>
        {entry.taskId && <span>· {taskNames[entry.taskId] ?? `Task #${entry.taskId}`}</span>}
      </div>
      {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
    </div>
  )
}

// ── Mobile add entry (simplified inline form) ──────────────────────────────────
function MobileAddEntry({
  workDate,
  timesheetId,
  userId,
  existingEntries,
  projects,
  onSave,
}: {
  workDate: string
  timesheetId: number
  userId: string
  existingEntries: TimeEntryResponse[]
  projects: { id: number; name: string }[]
  onSave: (payload: TimeEntryCreateRequest) => Promise<TimeEntryResponse | null>
}) {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState<number | ''>(projects[0]?.id ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  const handleSave = async () => {
    if (projectId === '' || !startTime || !endTime) { toast.error('Fill all required fields'); return }
    if (startTime >= endTime) { toast.error('End must be after start'); return }
    const overlap = existingEntries.find((e) =>
      timesOverlap(startTime, endTime, stripSeconds(e.startTime), stripSeconds(e.endTime)),
    )
    if (overlap) { toast.error('Time overlap detected'); return }

    setIsSaving(true)
    const result = await onSave({ timesheetId, projectId: projectId as number, userId, workDate, startTime: `${startTime}:00`, endTime: `${endTime}:00` })
    setIsSaving(false)
    if (result) setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
      <Plus className="h-3.5 w-3.5" /> Add entry
    </button>
  )

  return (
    <div className="space-y-2 pt-1">
      <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} className={selectClass}>
        <option value="">— Project —</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="flex gap-2">
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" loading={isSaving} onClick={handleSave}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">Save</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
      </div>
    </div>
  )
}
