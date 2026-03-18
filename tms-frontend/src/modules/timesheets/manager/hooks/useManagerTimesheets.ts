import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import { useAuth } from '@/hooks/useAuth'
import managerTimesheetService from '../services/managerTimesheetService'
import type { TimesheetResponse, TimeEntryResponse } from '../../types/timesheet.types'
import type { UserResponse } from '@/modules/users/types/user.types'
import type { ManagerTimesheetRow, ManagerRejectPayload } from '../types/managerTimesheet.types'
import type { ApiResponse } from '@/types/api.types'
import { calcDurationMinutes } from '../../utils/timesheetHelpers'

function getMsg(err: unknown, fallback: string): string {
  const e = err as AxiosError<ApiResponse<unknown>>
  return e?.response?.data?.message ?? fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard hook — loads all team's SUBMITTED timesheets for the manager
// ─────────────────────────────────────────────────────────────────────────────
export function useManagerDashboard() {
  const { user: authUser } = useAuth()

  const [rows, setRows] = useState<ManagerTimesheetRow[]>([])
  const [allUsers, setAllUsers] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 1. Fetch all users to resolve manager UUID from email
      const users = await managerTimesheetService.getAllUsers()
      setAllUsers(users)

      const currentUser = users.find((u) => u.email === authUser?.email)
      if (!currentUser) {
        setRows([])
        setIsLoading(false)
        return
      }

      // 2. Get direct reports
      const teamMembers = users.filter((u) => u.managerId === currentUser.id)

      // 3. For each team member fetch ALL their timesheets (any status)
      const results = await Promise.allSettled(
        teamMembers.map((member) =>
          managerTimesheetService.getTimesheetsByUser(member.id).then((timesheets) =>
            timesheets
              .map<ManagerTimesheetRow>((ts) => ({
                timesheet: ts,
                employee: member,
                totalMinutes: 0, // will be enriched separately if needed
              })),
          ),
        ),
      )

      const built: ManagerTimesheetRow[] = results.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : [],
      )

      // Sort newest submission first
      built.sort(
        (a, b) =>
          new Date(b.timesheet.submittedAt ?? b.timesheet.createdAt).getTime() -
          new Date(a.timesheet.submittedAt ?? a.timesheet.createdAt).getTime(),
      )

      setRows(built)
    } catch (err) {
      setError(getMsg(err, 'Failed to load team timesheets'))
    } finally {
      setIsLoading(false)
    }
  }, [authUser?.email])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    void load()
  }, [load])

  const updateRow = useCallback((updated: TimesheetResponse) => {
    setRows((prev) =>
      prev.map((r) =>
        r.timesheet.id === updated.id
          ? { ...r, timesheet: updated }
          : r,
      )
    )
  }, [])

  // Manager's own UUID resolved from allUsers
  const managerUser = useMemo(
    () => allUsers.find((u) => u.email === authUser?.email) ?? null,
    [allUsers, authUser?.email],
  )

  return { rows, allUsers, managerUser, isLoading, error, reload: load, updateRow }
}

// ─────────────────────────────────────────────────────────────────────────────
// Review hook — loads full detail for a single timesheet
// ─────────────────────────────────────────────────────────────────────────────
export function useTimesheetReview(timesheetId: number | null) {
  const [timesheet, setTimesheet] = useState<TimesheetResponse | null>(null)
  const [entries, setEntries] = useState<TimeEntryResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!timesheetId) return
    setIsLoading(true)
    setError(null)
    try {
      const [ts, ents] = await Promise.all([
        managerTimesheetService.getTimesheetById(timesheetId),
        managerTimesheetService.getEntriesByTimesheet(timesheetId),
      ])
      setTimesheet(ts)
      setEntries(ents)
    } catch (err) {
      setError(getMsg(err, 'Failed to load timesheet'))
    } finally {
      setIsLoading(false)
    }
  }, [timesheetId])

  useEffect(() => {
    void load()
  }, [load])

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
        const updated = await managerTimesheetService.approveTimesheet(timesheetId, approverId)
        setTimesheet(updated)
        toast.success('Timesheet approved successfully')
        return true
      } catch (err) {
        toast.error(getMsg(err, 'Failed to approve timesheet'))
        return false
      }
    },
    [timesheetId],
  )

  const reject = useCallback(
    async (payload: ManagerRejectPayload): Promise<boolean> => {
      if (!timesheetId) return false
      try {
        const updated = await managerTimesheetService.rejectTimesheet(timesheetId, payload)
        setTimesheet(updated)
        toast.success('Timesheet rejected')
        return true
      } catch (err) {
        toast.error(getMsg(err, 'Failed to reject timesheet'))
        return false
      }
    },
    [timesheetId],
  )

  return { timesheet, entries, totalMinutes, isLoading, error, reload: load, approve, reject }
}
