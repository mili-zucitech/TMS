import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  CalendarDays,
  ChevronRight,
  Plus,
  RefreshCw,
  AlertCircle,
  History,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useUserTimesheets } from '../hooks/useTimesheets'
import { TimesheetStatusBadge } from '../components/TimesheetStatusBadge'
import {
  getWeekStart,
  getWeekEnd,
  toDateString,
  formatDisplayDate,
} from '../utils/timesheetHelpers'
import type { TimesheetResponse } from '../types/timesheet.types'

import userModuleService from '@/modules/users/services/userService'
import type { UserResponse } from '@/modules/users/types/user.types'
import { toast } from 'sonner'

export default function TimesheetDashboardPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  // ── Resolve current user UUID ─────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const userLoadedRef = useRef(false)

  useEffect(() => {
    if (userLoadedRef.current) return
    userLoadedRef.current = true
    userModuleService
      .getUsers(0, 500)
      .then((page) => {
        const found = page.content.find((u) => u.email === authUser?.email) ?? null
        setCurrentUser(found)
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setUserLoading(false))
  }, [authUser])

  const userId = currentUser?.id ?? null

  const { timesheets, isLoading, error, fetchTimesheets, createTimesheet } =
    useUserTimesheets(userId)

  // ── Current week calculation ───────────────────────────────────────────────
  const currentWeekStart = useMemo(() => {
    const ws = getWeekStart(new Date())
    return toDateString(ws)
  }, [])
  const currentWeekEnd = useMemo(() => {
    const ws = getWeekStart(new Date())
    return toDateString(getWeekEnd(ws))
  }, [])

  const currentTimesheet = useMemo(
    () => timesheets.find((t) => t.weekStartDate === currentWeekStart) ?? null,
    [timesheets, currentWeekStart],
  )

  const pastTimesheets = useMemo(
    () =>
      timesheets
        .filter((t) => t.weekStartDate !== currentWeekStart)
        .slice(0, 5),
    [timesheets, currentWeekStart],
  )

  // ── Handle "open current week" ─────────────────────────────────────────────
  const [isCreating, setIsCreating] = useState(false)

  const handleOpenCurrentWeek = async () => {
    if (currentTimesheet) {
      navigate(`/timesheets/${currentTimesheet.id}`)
      return
    }
    if (!userId) {
      toast.error('User profile not loaded yet. Please wait.')
      return
    }
    setIsCreating(true)
    const ts = await createTimesheet({
      userId,
      weekStartDate: currentWeekStart,
      weekEndDate: currentWeekEnd,
    })
    setIsCreating(false)
    if (ts) navigate(`/timesheets/${ts.id}`)
  }

  // ── Status color for timeline dots ────────────────────────────────────────
  function dotColor(status: TimesheetResponse['status']) {
    const map: Record<string, string> = {
      DRAFT: 'bg-slate-400',
      SUBMITTED: 'bg-blue-500',
      APPROVED: 'bg-emerald-500',
      REJECTED: 'bg-red-500',
      LOCKED: 'bg-violet-500',
    }
    return map[status] ?? 'bg-slate-400'
  }

  const loading = userLoading || isLoading

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Timesheets</h1>
              <p className="text-sm text-muted-foreground">
                {currentUser ? `Logged in as ${currentUser.name}` : 'Loading profile…'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => void fetchTimesheets()}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/timesheets/history')}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Full History
            </Button>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Current week card ─────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Current Week
          </h2>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-lg">
                    {formatDisplayDate(currentWeekStart)} – {formatDisplayDate(currentWeekEnd)}
                  </p>
                  {currentTimesheet ? (
                    <div className="flex items-center gap-2 mt-1">
                      <TimesheetStatusBadge status={currentTimesheet.status} />
                      {currentTimesheet.status === 'REJECTED' && currentTimesheet.rejectionReason && (
                        <span className="text-xs text-destructive">
                          {currentTimesheet.rejectionReason}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No timesheet created yet</p>
                  )}
                </div>

                <Button
                  onClick={handleOpenCurrentWeek}
                  loading={isCreating}
                  className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shrink-0"
                >
                  {currentTimesheet ? (
                    <>
                      <CalendarDays className="h-4 w-4" />
                      {currentTimesheet.status === 'DRAFT' || currentTimesheet.status === 'REJECTED'
                        ? 'Log Hours'
                        : 'View Timesheet'}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Start This Week
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── Recent timesheets ─────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Recent Timesheets
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : pastTimesheets.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No past timesheets yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastTimesheets.map((ts) => (
                <button
                  key={ts.id}
                  onClick={() => navigate(`/timesheets/${ts.id}`)}
                  className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:bg-muted/30 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor(ts.status)}`} />
                    <div>
                      <p className="text-sm font-medium">
                        {formatDisplayDate(ts.weekStartDate)} – {formatDisplayDate(ts.weekEndDate)}
                      </p>
                      {ts.submittedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {new Date(ts.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TimesheetStatusBadge status={ts.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}

              {timesheets.length > 6 && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => navigate('/timesheets/history')}
                >
                  View all {timesheets.length} timesheets
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
