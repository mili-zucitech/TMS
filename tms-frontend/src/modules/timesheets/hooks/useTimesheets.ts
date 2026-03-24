import { useCallback } from 'react'
import { toast } from 'sonner'

import {
  useGetTimesheetsByUserQuery,
  useGetTimesheetByIdQuery,
  useCreateTimesheetMutation,
  useSubmitTimesheetMutation,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation,
  useGetEntriesByTimesheetQuery,
  useCreateTimeEntryMutation,
  useUpdateTimeEntryMutation,
  useDeleteTimeEntryMutation,
} from '@/features/timesheets/timesheetsApi'
import type {
  TimesheetResponse,
  TimesheetCreateRequest,
  TimesheetRejectRequest,
  TimeEntryResponse,
  TimeEntryCreateRequest,
  TimeEntryUpdateRequest,
} from '../types/timesheet.types'

function getErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string } })?.data?.message
  return msg ?? fallback
}

// â”€â”€ User's timesheets list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useUserTimesheets(userId: string | null) {
  const {
    data: rawTimesheets = [],
    isLoading,
    error: queryError,
    refetch: fetchTimesheets,
  } = useGetTimesheetsByUserQuery(userId!, { skip: !userId })

  // Sort newest first (same behaviour as old hook)
  const timesheets = [...rawTimesheets].sort(
    (a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime(),
  )
  const error = queryError ? getErrorMessage(queryError, 'Failed to load timesheets') : null

  const [createTimesheetMutation] = useCreateTimesheetMutation()
  const [submitTimesheetMutation] = useSubmitTimesheetMutation()
  const [approveTimesheetMutation] = useApproveTimesheetMutation()
  const [rejectTimesheetMutation] = useRejectTimesheetMutation()

  const createTimesheet = useCallback(
    async (payload: TimesheetCreateRequest): Promise<TimesheetResponse | null> => {
      try {
        const ts = await createTimesheetMutation(payload).unwrap()
        toast.success('Timesheet created')
        return ts
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to create timesheet'))
        return null
      }
    },
    [createTimesheetMutation],
  )

  const submitTimesheet = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await submitTimesheetMutation(id).unwrap()
        toast.success('Timesheet submitted successfully')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to submit timesheet'))
        return false
      }
    },
    [submitTimesheetMutation],
  )

  const approveTimesheet = useCallback(
    async (id: number, approverId?: string): Promise<boolean> => {
      try {
        await approveTimesheetMutation({
          id,
          body: approverId ? { approvedBy: approverId } : undefined,
        }).unwrap()
        toast.success('Timesheet approved')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to approve timesheet'))
        return false
      }
    },
    [approveTimesheetMutation],
  )

  const rejectTimesheet = useCallback(
    async (id: number, payload: TimesheetRejectRequest): Promise<boolean> => {
      try {
        await rejectTimesheetMutation({ id, body: payload }).unwrap()
        toast.success('Timesheet rejected')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to reject timesheet'))
        return false
      }
    },
    [rejectTimesheetMutation],
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

// â”€â”€ Single timesheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useTimesheet(id: number | null) {
  const {
    data: timesheet = null,
    isLoading,
    error: queryError,
    refetch: fetchTimesheet,
  } = useGetTimesheetByIdQuery(id!, { skip: id === null })
  const error = queryError ? getErrorMessage(queryError, 'Failed to load timesheet') : null
  return { timesheet, isLoading, error, fetchTimesheet }
}

// â”€â”€ Time entries for a timesheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useTimeEntries(timesheetId: number | null) {
  const {
    data: entries = [],
    isLoading,
    error: queryError,
    refetch: fetchEntries,
  } = useGetEntriesByTimesheetQuery(timesheetId!, {
    skip: timesheetId === null || Number.isNaN(timesheetId),
  })
  const error = queryError ? getErrorMessage(queryError, 'Failed to load time entries') : null

  const [createTimeEntryMutation] = useCreateTimeEntryMutation()
  const [updateTimeEntryMutation] = useUpdateTimeEntryMutation()
  const [deleteTimeEntryMutation] = useDeleteTimeEntryMutation()

  const createEntry = useCallback(
    async (payload: TimeEntryCreateRequest): Promise<TimeEntryResponse | null> => {
      try {
        const entry = await createTimeEntryMutation(payload).unwrap()
        toast.success('Time entry saved')
        return entry
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to save time entry'))
        return null
      }
    },
    [createTimeEntryMutation],
  )

  const updateEntry = useCallback(
    async (id: number, payload: TimeEntryUpdateRequest): Promise<boolean> => {
      if (!timesheetId) return false
      try {
        await updateTimeEntryMutation({ id, body: payload, timesheetId }).unwrap()
        toast.success('Entry updated')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update entry'))
        return false
      }
    },
    [updateTimeEntryMutation, timesheetId],
  )

  const deleteEntry = useCallback(
    async (id: number): Promise<boolean> => {
      if (!timesheetId) return false
      try {
        await deleteTimeEntryMutation({ id, timesheetId }).unwrap()
        toast.success('Entry deleted')
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete entry'))
        return false
      }
    },
    [deleteTimeEntryMutation, timesheetId],
  )

  return { entries, isLoading, error, fetchEntries, createEntry, updateEntry, deleteEntry }
}
