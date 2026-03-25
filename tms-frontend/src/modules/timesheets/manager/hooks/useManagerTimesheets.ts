import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/useAuth'
import {
  useGetUsersQuery,
} from '@/features/users/usersApi'
import {
  useGetTeamTimesheetsQuery,
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

  // Fetch all timesheets for the manager's team in a single request
  const {
    data: teamTimesheets = [],
    isLoading: isLoadingTimesheets,
    error: timesheetsError,
    refetch,
  } = useGetTeamTimesheetsQuery(managerId!, { skip: !managerId })

  // Build a lookup map: userId -> UserResponse
  const userMap = useMemo(() => {
    const map = new Map<string, UserResponse>()
    allUsers.forEach((u) => map.set(u.id, u))
    return map
  }, [allUsers])

  // Transform timesheets into ManagerTimesheetRow[], joining with employee data
  const rows = useMemo<ManagerTimesheetRow[]>(() => {
    return teamTimesheets
      .map((ts) => {
        const employee = userMap.get(ts.userId)
        if (!employee) return null
        return { timesheet: ts, employee, totalMinutes: 0 } satisfies ManagerTimesheetRow
      })
      .filter((r): r is ManagerTimesheetRow => r !== null)
  }, [teamTimesheets, userMap])

  const [approveTimesheetMutation] = useApproveTimesheetMutation()
  const [rejectTimesheetMutation] = useRejectTimesheetMutation()

  const isLoading = isLoadingUsers || isLoadingTimesheets
  const error = timesheetsError
    ? getMsg(timesheetsError, 'Failed to load team timesheets')
    : null

  return {
    allUsers,
    managerUser,
    directReports,
    isLoading,
    error,
    rows,
    reload: refetch,
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
