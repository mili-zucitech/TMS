import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'

import timesheetService from '../services/timesheetService'
import type {
  TimesheetResponse,
  TimesheetCreateRequest,
  TimesheetRejectRequest,
  TimeEntryResponse,
  TimeEntryCreateRequest,
  TimeEntryUpdateRequest,
} from '../types/timesheet.types'
import type { ApiResponse } from '@/types/api.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? fallback
}

// ── User's timesheets list ────────────────────────────────────────────────────
export function useUserTimesheets(userId: string | null) {
  const [timesheets, setTimesheets] = useState<TimesheetResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTimesheets = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await timesheetService.getTimesheetsByUser(userId)
      // sort newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime(),
      )
      setTimesheets(sorted)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load timesheets'))
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])

  const createTimesheet = useCallback(
    async (payload: TimesheetCreateRequest): Promise<TimesheetResponse | null> => {
      try {
        const ts = await timesheetService.createTimesheet(payload)
        toast.success('Timesheet created')
        await fetchTimesheets()
        return ts
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create timesheet'))
        return null
      }
    },
    [fetchTimesheets],
  )

  const submitTimesheet = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await timesheetService.submitTimesheet(id)
        toast.success('Timesheet submitted successfully')
        await fetchTimesheets()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to submit timesheet'))
        return false
      }
    },
    [fetchTimesheets],
  )

  const approveTimesheet = useCallback(
    async (id: number, approverId?: string): Promise<boolean> => {
      try {
        await timesheetService.approveTimesheet(id, approverId ? { approvedBy: approverId } : undefined)
        toast.success('Timesheet approved')
        await fetchTimesheets()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to approve timesheet'))
        return false
      }
    },
    [fetchTimesheets],
  )

  const rejectTimesheet = useCallback(
    async (id: number, payload: TimesheetRejectRequest): Promise<boolean> => {
      try {
        await timesheetService.rejectTimesheet(id, payload)
        toast.success('Timesheet rejected')
        await fetchTimesheets()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to reject timesheet'))
        return false
      }
    },
    [fetchTimesheets],
  )

  return {
    timesheets,
    isLoading,
    error,
    fetchTimesheets,
    createTimesheet,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet,
  }
}

// ── Single timesheet ──────────────────────────────────────────────────────────
export function useTimesheet(id: number | null) {
  const [timesheet, setTimesheet] = useState<TimesheetResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTimesheet = useCallback(async () => {
    if (id === null) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await timesheetService.getTimesheetById(id)
      setTimesheet(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load timesheet'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTimesheet()
  }, [fetchTimesheet])

  return { timesheet, isLoading, error, fetchTimesheet, setTimesheet }
}

// ── Time entries for a timesheet ───────────────────────────────────────────────
export function useTimeEntries(timesheetId: number | null) {
  const [entries, setEntries] = useState<TimeEntryResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (timesheetId === null || Number.isNaN(timesheetId)) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await timesheetService.getEntriesByTimesheet(timesheetId)
      setEntries(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load time entries'))
    } finally {
      setIsLoading(false)
    }
  }, [timesheetId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const createEntry = useCallback(
    async (payload: TimeEntryCreateRequest): Promise<TimeEntryResponse | null> => {
      try {
        const entry = await timesheetService.createTimeEntry(payload)
        toast.success('Time entry saved')
        await fetchEntries()
        return entry
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to save time entry'))
        return null
      }
    },
    [fetchEntries],
  )

  const updateEntry = useCallback(
    async (id: number, payload: TimeEntryUpdateRequest): Promise<boolean> => {
      try {
        await timesheetService.updateTimeEntry(id, payload)
        toast.success('Entry updated')
        await fetchEntries()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update entry'))
        return false
      }
    },
    [fetchEntries],
  )

  const deleteEntry = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await timesheetService.deleteTimeEntry(id)
        toast.success('Entry deleted')
        await fetchEntries()
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete entry'))
        return false
      }
    },
    [fetchEntries],
  )

  return { entries, isLoading, error, fetchEntries, createEntry, updateEntry, deleteEntry }
}
