import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useUserTimesheets,
  useTimesheet,
  useTimeEntries,
} from '@/modules/timesheets/hooks/useTimesheets'
import timesheetService from '@/modules/timesheets/services/timesheetService'

vi.mock('@/modules/timesheets/services/timesheetService')
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedGetTimesheetsByUser = vi.mocked(timesheetService.getTimesheetsByUser)
const mockedGetTimesheetById = vi.mocked(timesheetService.getTimesheetById)
const mockedCreateTimesheet = vi.mocked(timesheetService.createTimesheet)
const mockedSubmitTimesheet = vi.mocked(timesheetService.submitTimesheet)
const mockedApproveTimesheet = vi.mocked(timesheetService.approveTimesheet)
const mockedRejectTimesheet = vi.mocked(timesheetService.rejectTimesheet)
const mockedGetEntries = vi.mocked(timesheetService.getEntriesByTimesheet)
const mockedCreateEntry = vi.mocked(timesheetService.createTimeEntry)
const mockedUpdateEntry = vi.mocked(timesheetService.updateTimeEntry)
const mockedDeleteEntry = vi.mocked(timesheetService.deleteTimeEntry)

const draftTimesheet = {
  id: 1,
  userId: 'user-001',
  weekStartDate: '2024-01-01',
  weekEndDate: '2024-01-07',
  status: 'DRAFT' as const,
  submittedAt: null,
  approvedAt: null,
  approvedBy: null,
  rejectionReason: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const sampleEntry = {
  id: 100,
  timesheetId: 1,
  projectId: 5,
  taskId: null,
  taskNote: null,
  userId: 'user-001',
  workDate: '2024-01-02',
  startTime: '09:00:00',
  endTime: '17:00:00',
  durationMinutes: 480,
  description: 'Dev work',
  createdAt: '2024-01-02T09:00:00Z',
  updatedAt: '2024-01-02T17:00:00Z',
}

describe('useUserTimesheets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fetch when userId is null', () => {
    const { result } = renderHook(() => useUserTimesheets(null))
    expect(result.current.timesheets).toEqual([])
    expect(mockedGetTimesheetsByUser).not.toHaveBeenCalled()
  })

  it('fetches timesheets on mount (sorted newest first)', async () => {
    const older = { ...draftTimesheet, id: 1, weekStartDate: '2024-01-01' }
    const newer = { ...draftTimesheet, id: 2, weekStartDate: '2024-02-01' }
    mockedGetTimesheetsByUser.mockResolvedValue([older, newer])

    const { result } = renderHook(() => useUserTimesheets('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockedGetTimesheetsByUser).toHaveBeenCalledWith('user-001')
    // Newest first
    expect(result.current.timesheets[0].id).toBe(2)
    expect(result.current.timesheets[1].id).toBe(1)
  })

  it('sets error state when fetch fails', async () => {
    const err = Object.assign(new Error('Fail'), {
      response: { data: { message: 'Server error' } },
    })
    mockedGetTimesheetsByUser.mockRejectedValue(err)

    const { result } = renderHook(() => useUserTimesheets('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Server error')
  })

  it('createTimesheet calls service and returns the new timesheet', async () => {
    mockedGetTimesheetsByUser.mockResolvedValue([])
    const newTs = { ...draftTimesheet, id: 42 }
    mockedCreateTimesheet.mockResolvedValue(newTs)
    // second call after create
    mockedGetTimesheetsByUser.mockResolvedValue([newTs])

    const { result } = renderHook(() => useUserTimesheets('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: typeof draftTimesheet | null = null
    await act(async () => {
      created = await result.current.createTimesheet({
        userId: 'user-001',
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
      })
    })

    expect(mockedCreateTimesheet).toHaveBeenCalledTimes(1)
    expect(created?.id).toBe(42)
  })

  it('submitTimesheet returns true on success', async () => {
    mockedGetTimesheetsByUser.mockResolvedValue([draftTimesheet])
    const submitted = { ...draftTimesheet, status: 'SUBMITTED' as const }
    mockedSubmitTimesheet.mockResolvedValue(submitted)
    mockedGetTimesheetsByUser.mockResolvedValue([submitted])

    const { result } = renderHook(() => useUserTimesheets('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let success = false
    await act(async () => {
      success = await result.current.submitTimesheet(1)
    })
    expect(success).toBe(true)
    expect(mockedSubmitTimesheet).toHaveBeenCalledWith(1)
  })

  it('submitTimesheet returns false on error', async () => {
    mockedGetTimesheetsByUser.mockResolvedValue([draftTimesheet])
    mockedSubmitTimesheet.mockRejectedValue(new Error('Fail'))

    const { result } = renderHook(() => useUserTimesheets('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let success = true
    await act(async () => {
      success = await result.current.submitTimesheet(1)
    })
    expect(success).toBe(false)
  })

  it('approveTimesheet calls service with correct args', async () => {
    mockedGetTimesheetsByUser.mockResolvedValue([draftTimesheet])
    const approved = { ...draftTimesheet, status: 'APPROVED' as const }
    mockedApproveTimesheet.mockResolvedValue(approved)
    mockedGetTimesheetsByUser.mockResolvedValue([approved])

    const { result } = renderHook(() => useUserTimesheets('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.approveTimesheet(1, 'manager-001')
    })

    expect(mockedApproveTimesheet).toHaveBeenCalledWith(1, { approvedBy: 'manager-001' })
  })

  it('rejectTimesheet calls service with rejection payload', async () => {
    mockedGetTimesheetsByUser.mockResolvedValue([draftTimesheet])
    const rejected = { ...draftTimesheet, status: 'REJECTED' as const }
    mockedRejectTimesheet.mockResolvedValue(rejected)
    mockedGetTimesheetsByUser.mockResolvedValue([rejected])

    const { result } = renderHook(() => useUserTimesheets('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.rejectTimesheet(1, { rejectionReason: 'Incomplete' })
    })

    expect(mockedRejectTimesheet).toHaveBeenCalledWith(1, { rejectionReason: 'Incomplete' })
  })
})

describe('useTimesheet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fetch when id is null', () => {
    const { result } = renderHook(() => useTimesheet(null))
    expect(result.current.timesheet).toBeNull()
    expect(mockedGetTimesheetById).not.toHaveBeenCalled()
  })

  it('fetches timesheet by id on mount', async () => {
    mockedGetTimesheetById.mockResolvedValue(draftTimesheet)
    const { result } = renderHook(() => useTimesheet(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedGetTimesheetById).toHaveBeenCalledWith(1)
    expect(result.current.timesheet).toEqual(draftTimesheet)
  })

  it('sets error when fetch fails', async () => {
    const err = Object.assign(new Error('Not Found'), {
      response: { data: { message: 'Timesheet not found' } },
    })
    mockedGetTimesheetById.mockRejectedValue(err)
    const { result } = renderHook(() => useTimesheet(999))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('Timesheet not found')
  })
})

describe('useTimeEntries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fetch when timesheetId is null', () => {
    const { result } = renderHook(() => useTimeEntries(null))
    expect(result.current.entries).toEqual([])
    expect(mockedGetEntries).not.toHaveBeenCalled()
  })

  it('fetches entries on mount', async () => {
    mockedGetEntries.mockResolvedValue([sampleEntry])
    const { result } = renderHook(() => useTimeEntries(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedGetEntries).toHaveBeenCalledWith(1)
    expect(result.current.entries).toHaveLength(1)
  })

  it('createEntry calls service and refetches', async () => {
    mockedGetEntries.mockResolvedValue([])
    mockedCreateEntry.mockResolvedValue(sampleEntry)
    mockedGetEntries.mockResolvedValue([sampleEntry])

    const { result } = renderHook(() => useTimeEntries(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createEntry({
        timesheetId: 1,
        projectId: 5,
        userId: 'user-001',
        workDate: '2024-01-02',
        startTime: '09:00',
        endTime: '17:00',
      })
    })
    expect(mockedCreateEntry).toHaveBeenCalledTimes(1)
  })

  it('updateEntry calls service with correct id', async () => {
    mockedGetEntries.mockResolvedValue([sampleEntry])
    mockedUpdateEntry.mockResolvedValue({ ...sampleEntry, description: 'Updated' })
    mockedGetEntries.mockResolvedValue([{ ...sampleEntry, description: 'Updated' }])

    const { result } = renderHook(() => useTimeEntries(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let success = false
    await act(async () => {
      success = await result.current.updateEntry(100, { description: 'Updated' })
    })
    expect(success).toBe(true)
    expect(mockedUpdateEntry).toHaveBeenCalledWith(100, { description: 'Updated' })
  })

  it('deleteEntry calls service and refetches', async () => {
    mockedGetEntries.mockResolvedValue([sampleEntry])
    mockedDeleteEntry.mockResolvedValue(undefined)
    mockedGetEntries.mockResolvedValue([])

    const { result } = renderHook(() => useTimeEntries(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.deleteEntry(100)
    })
    expect(mockedDeleteEntry).toHaveBeenCalledWith(100)
  })
})
