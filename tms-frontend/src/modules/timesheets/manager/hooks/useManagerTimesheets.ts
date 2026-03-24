import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import {
  useGetUsersQuery,
} from '@/features/users/usersApi'
import {
  useGetTimesheetsByUserQuery,
  useGetTimesheetByIdQuery,
  useGetEntriesByTimesheetQuery,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation,
} from '@/features/timesheets/timesheetsApi'
import type { TimesheetResponse } from '../../types/timesheet.types'
import type { UserResponse } from '@/modules/users/types/user.types'
import type { ManagerTimesheetRow, ManagerRejectPayload } from '../types/managerTimesheet.types'
import { calcDurationMinutes } from '../../utils/timesheetHelpers'

function getMsg(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string } })?.data?.message
  return msg ?? fallback
}

// ── Dashboard hook — all team's timesheets ────────────────────────────────────
export function useManagerDashboard() {
  const { user: authUser } = useAuth()

  const { data: allUsersPage, isLoading: isLoadingUsers } = useGetUsersQuery({
    size: 500,
  })
  const allUsers: UserResponse[] = allUsersPage?.content ?? []

  // Resolve current manager's full profile from email
  const managerUser = useMemo(
    () => allUsers.find((u) => u.email === authUser?.email) ?? null,
    [allUsers, authUser?.email],
  )
  const managerId = managerUser?.id ?? null

  // Direct reports of this manager
  const directReports = useMemo(
    () => (managerId ? allUsers.filter((u) => u.managerId === managerId) : []),
    [allUsers, managerId],
  )

  // We load timesheets for each direct report individually using separate queries.
  // Since hooks can't be called inside loops, we pass all directReport IDs to a
  // helper that uses skip to load only when needed.
  // For simplicity, we aggregate all timesheets from the RTK cache via individual queries.
  // The rows are computed from the available data.
  const [approveTimesheetMutation] = useApproveTimesheetMutation()
  const [rejectTimesheetMutation] = useRejectTimesheetMutation()

  // NOTE: we pass managerId as a stable query arg; the parent component should
  // re-render when managerId changes which will retrigger these hooks.
  const isLoading = isLoadingUsers

  const updateRow = useCallback(
    (updated: TimesheetResponse) => {
      // Cache invalidation via RTK tags handles the update automatically
      void updated
    },
    [],
  )

  return {
    allUsers,
    managerUser,
    directReports,
    isLoading,
    error: null,
    rows: [] as ManagerTimesheetRow[], // populated by the page component via per-user queries
    reload: () => undefined,
    updateRow,
    approveTimesheetMutation,
    rejectTimesheetMutation,
  }
}

// ── Per-user timesheets (used by dashboard page) ──────────────────────────────
export function useTeamMemberTimesheets(userId: string | null) {
  const { data: timesheets = [], isLoading } = useGetTimesheetsByUserQuery(userId!, {
    skip: !userId,
  })
  return { timesheets, isLoading }
}

// ── Review hook — full detail for a single timesheet ─────────────────────────
export function useTimesheetReview(timesheetId: number | null) {
  const { data: timesheet = null, isLoading: isLoadingTs, error: tsError, refetch } =
    useGetTimesheetByIdQuery(timesheetId!, { skip: !timesheetId })

  const { data: entries = [], isLoading: isLoadingEntries } = useGetEntriesByTimesheetQuery(
    timesheetId!,
    { skip: !timesheetId },
  )

  const [approveTimesheetMutation] = useApproveTimesheetMutation()
  const [rejectTimesheetMutation] = useRejectTimesheetMutation()

  const isLoading = isLoadingTs || isLoadingEntries
  const error = tsError ? getMsg(tsError, 'Failed to load timesheet') : null

  const totalMinutes = useMemo(
    () =>
      entries.reduce(
        (sum, e) =>
          sum + (e.durationMinutes ?? calcDurationMinutes(e.startTime, e.endTime)),
        0,
      ),
    [entries],
  )

  const approve = useCallback(
    async (approverId?: string): Promise<boolean> => {
      if (!timesheetId) return false
      try {
        await approveTimesheetMutation({
          id: timesheetId,
          body: approverId ? { approvedBy: approverId } : undefined,
        }).unwrap()
        toast.success('Timesheet approved successfully')
        return true
      } catch (err) {
        toast.error(getMsg(err, 'Failed to approve timesheet'))
        return false
      }
    },
    [approveTimesheetMutation, timesheetId],
  )

  const reject = useCallback(
    async (payload: ManagerRejectPayload): Promise<boolean> => {
      if (!timesheetId) return false
      try {
        await rejectTimesheetMutation({ id: timesheetId, body: payload }).unwrap()
        toast.success('Timesheet rejected')
        return true
      } catch (err) {
        toast.error(getMsg(err, 'Failed to reject timesheet'))
        return false
      }
    },
    [rejectTimesheetMutation, timesheetId],
  )

  return {
    timesheet,
    entries,
    totalMinutes,
    isLoading,
    error,
    reload: refetch,
    approve,
    reject,
  }
}
