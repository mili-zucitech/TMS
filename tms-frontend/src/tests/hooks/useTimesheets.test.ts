import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import {
  useUserTimesheets,
  useTimesheet,
  useTimeEntries,
} from '@/modules/timesheets/hooks/useTimesheets'
import { createReduxWrapper } from '@/test/renderWithStore'

const BASE = 'http://localhost:8080/api/v1'

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

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, message: 'OK' })
}

describe('useUserTimesheets', () => {
  beforeEach(() => localStorage.clear())

  it('does not fetch when userId is null', async () => {
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useUserTimesheets(null), { wrapper })
    expect(result.current.timesheets).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches timesheets on mount (sorted newest first)', async () => {
    const older = { ...draftTimesheet, id: 1, weekStartDate: '2024-01-01' }
    const newer = { ...draftTimesheet, id: 2, weekStartDate: '2024-02-01' }

    server.use(
      http.get(`${BASE}/timesheets/user/user-001`, () => ok([older, newer])),
    )

    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useUserTimesheets('user-001'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.timesheets[0].id).toBe(2) // newest first
    expect(result.current.timesheets[1].id).toBe(1)
  })

  it('sets error state when fetch fails', async () => {
    server.use(
      http.get(`${BASE}/timesheets/user/user-001`, () =>
        new HttpResponse(null, { status: 500 }),
      ),
    )

    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useUserTimesheets('user-001'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).not.toBeNull()
  })
})

describe('useTimesheet', () => {
  beforeEach(() => localStorage.clear())

  it('returns null timesheet when id is null', () => {
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useTimesheet(null), { wrapper })
    expect(result.current.timesheet).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches a timesheet by id', async () => {
    server.use(
      http.get(`${BASE}/timesheets/1`, () => ok(draftTimesheet)),
    )

    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useTimesheet(1), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.timesheet?.id).toBe(1)
  })
})

describe('useTimeEntries', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty entries when timesheetId is null', () => {
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useTimeEntries(null), { wrapper })
    expect(result.current.entries).toEqual([])
  })

  it('fetches entries for a timesheet', async () => {
    const mockEntry = {
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

    server.use(
      http.get(`${BASE}/time-entries/timesheet/1`, () => ok([mockEntry])),
    )

    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useTimeEntries(1), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBe(100)
  })
})
