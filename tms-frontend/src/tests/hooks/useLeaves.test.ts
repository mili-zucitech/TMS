import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import { useMyLeaves, useTeamLeaves, useLeaveBalance, useLeaveTypes } from '@/modules/leaves/hooks/useLeaves'
import { createReduxWrapper } from '@/test/renderWithStore'

const BASE = 'http://localhost:8080/api/v1'

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, message: 'OK' })
}

const pendingLeave = {
  id: 1,
  userId: 'user-001',
  leaveTypeId: 1,
  leaveTypeName: 'Annual Leave',
  startDate: '2024-03-01',
  endDate: '2024-03-05',
  totalDays: 5,
  reason: 'Vacation',
  status: 'PENDING' as const,
  appliedAt: '2024-02-20T10:00:00Z',
  approvedAt: undefined,
  approvedBy: undefined,
  rejectionReason: undefined,
  employeeName: 'John Doe',
}

const sampleBalance = {
  id: 1,
  userId: 'user-001',
  leaveTypeId: 1,
  leaveTypeName: 'Annual Leave',
  year: 2024,
  totalAllocated: 20,
  usedLeaves: 3,
  remainingLeaves: 17,
  updatedAt: '2024-01-01T00:00:00Z',
}

const sampleLeaveType = {
  id: 1,
  name: 'Annual Leave',
  description: 'Standard annual leave',
  defaultAnnualAllocation: 20,
  requiresApproval: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('useMyLeaves', () => {
  beforeEach(() => localStorage.clear())

  it('starts with empty leaves and isLoading=false when userId is null', () => {
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useMyLeaves(null), { wrapper })
    expect(result.current.leaves).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches leaves on mount when userId is provided', async () => {
    server.use(
      http.get(`${BASE}/leaves/user/user-001`, () => ok([pendingLeave])),
    )
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useMyLeaves('user-001'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.leaves).toEqual([pendingLeave])
    expect(result.current.error).toBeNull()
  })

  it('sets error state when fetch fails', async () => {
    server.use(
      http.get(`${BASE}/leaves/user/user-001`, () =>
        new HttpResponse(null, { status: 500 }),
      ),
    )
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useMyLeaves('user-001'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).not.toBeNull()
  })
})

describe('useTeamLeaves', () => {
  beforeEach(() => localStorage.clear())

  it('does not fetch when userId is null', () => {
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useTeamLeaves(null), { wrapper })
    expect(result.current.leaves).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches team leaves on mount', async () => {
    const teamLeave = { ...pendingLeave, userId: 'direct-001', employeeName: 'Jane' }
    server.use(
      http.get(`${BASE}/leaves/manager/manager-001`, () => ok([teamLeave])),
    )
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useTeamLeaves('manager-001'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.leaves).toHaveLength(1)
  })

  it('sets error state when fetch fails', async () => {
    server.use(
      http.get(`${BASE}/leaves/manager/manager-001`, () =>
        new HttpResponse(null, { status: 500 }),
      ),
    )
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useTeamLeaves('manager-001'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).not.toBeNull()
  })
})

describe('useLeaveBalance', () => {
  beforeEach(() => localStorage.clear())

  it('does not fetch when userId is null', () => {
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useLeaveBalance(null), { wrapper })
    expect(result.current.balances).toEqual([])
  })

  it('fetches balance on mount', async () => {
    server.use(
      http.get(`${BASE}/leave-balances/user/user-001`, () => ok([sampleBalance])),
    )
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useLeaveBalance('user-001'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.balances[0].remainingLeaves).toBe(17)
  })
})

describe('useLeaveTypes', () => {
  beforeEach(() => localStorage.clear())

  it('fetches leave types on mount', async () => {
    server.use(
      http.get(`${BASE}/leave-types`, () => ok([sampleLeaveType])),
    )
    const { wrapper } = createReduxWrapper()
    const { result } = renderHook(() => useLeaveTypes(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.leaveTypes).toHaveLength(1)
    expect(result.current.leaveTypes[0].name).toBe('Annual Leave')
  })
})
