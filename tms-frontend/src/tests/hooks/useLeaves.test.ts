import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMyLeaves, useTeamLeaves, useLeaveBalance, useLeaveTypes } from '@/modules/leaves/hooks/useLeaves'
import * as leaveService from '@/modules/leaves/services/leaveService'

// Mock the leave service
vi.mock('@/modules/leaves/services/leaveService')

// Mock sonner toast to avoid side-effects in tests
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedGetLeavesByUser = vi.mocked(leaveService.getLeavesByUser)
const mockedGetTeamLeavesByManager = vi.mocked(leaveService.getTeamLeavesByManager)
const mockedApplyLeave = vi.mocked(leaveService.applyLeave)
const mockedCancelLeave = vi.mocked(leaveService.cancelLeave)
const mockedApproveLeave = vi.mocked(leaveService.approveLeave)
const mockedRejectLeave = vi.mocked(leaveService.rejectLeave)
const mockedGetLeaveBalance = vi.mocked(leaveService.getLeaveBalance)
const mockedGetLeaveTypes = vi.mocked(leaveService.getLeaveTypes)

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with empty leaves and loading=false when userId is null', () => {
    mockedGetLeavesByUser.mockResolvedValue([])
    const { result } = renderHook(() => useMyLeaves(null))
    expect(result.current.leaves).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(mockedGetLeavesByUser).not.toHaveBeenCalled()
  })

  it('fetches leaves on mount when userId is provided', async () => {
    mockedGetLeavesByUser.mockResolvedValue([pendingLeave])
    const { result } = renderHook(() => useMyLeaves('user-001'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockedGetLeavesByUser).toHaveBeenCalledWith('user-001')
    expect(result.current.leaves).toEqual([pendingLeave])
    expect(result.current.error).toBeNull()
  })

  it('sets error state when fetch fails', async () => {
    mockedGetLeavesByUser.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useMyLeaves('user-001'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Failed to load leave requests')
    expect(result.current.leaves).toEqual([])
  })

  it('submitLeave calls applyLeave and prepends to the list', async () => {
    mockedGetLeavesByUser.mockResolvedValue([])
    const newLeave = { ...pendingLeave, id: 99 }
    mockedApplyLeave.mockResolvedValue(newLeave)

    const { result } = renderHook(() => useMyLeaves('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.submitLeave({
        userId: 'user-001',
        leaveTypeId: 1,
        startDate: '2024-03-01',
        endDate: '2024-03-05',
      })
    })

    expect(mockedApplyLeave).toHaveBeenCalledTimes(1)
    expect(result.current.leaves[0]).toEqual(newLeave)
  })

  it('cancel calls cancelLeave and updates the leave in the list', async () => {
    mockedGetLeavesByUser.mockResolvedValue([pendingLeave])
    const cancelled = { ...pendingLeave, status: 'CANCELLED' as const }
    mockedCancelLeave.mockResolvedValue(cancelled)

    const { result } = renderHook(() => useMyLeaves('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.cancel(1)
    })

    expect(mockedCancelLeave).toHaveBeenCalledWith(1)
    expect(result.current.leaves[0].status).toBe('CANCELLED')
  })
})

describe('useTeamLeaves', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fetch when userId is null', () => {
    mockedGetTeamLeavesByManager.mockResolvedValue([])
    const { result } = renderHook(() => useTeamLeaves(null))
    expect(result.current.leaves).toEqual([])
    expect(mockedGetTeamLeavesByManager).not.toHaveBeenCalled()
  })

  it('fetches team leaves on mount', async () => {
    const teamLeave = { ...pendingLeave, userId: 'direct-001', employeeName: 'Jane' }
    mockedGetTeamLeavesByManager.mockResolvedValue([teamLeave])

    const { result } = renderHook(() => useTeamLeaves('manager-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockedGetTeamLeavesByManager).toHaveBeenCalledWith('manager-001')
    expect(result.current.leaves).toHaveLength(1)
  })

  it('approve calls approveLeave and updates status in list', async () => {
    const teamLeave = { ...pendingLeave, id: 2 }
    mockedGetTeamLeavesByManager.mockResolvedValue([teamLeave])
    const approved = { ...teamLeave, status: 'APPROVED' as const }
    mockedApproveLeave.mockResolvedValue(approved)

    const { result } = renderHook(() => useTeamLeaves('manager-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.approve(2, { approvedBy: 'manager-001' })
    })

    expect(mockedApproveLeave).toHaveBeenCalledWith(2, { approvedBy: 'manager-001' })
    expect(result.current.leaves[0].status).toBe('APPROVED')
  })

  it('reject calls rejectLeave and updates status in list', async () => {
    const teamLeave = { ...pendingLeave, id: 3 }
    mockedGetTeamLeavesByManager.mockResolvedValue([teamLeave])
    const rejected = { ...teamLeave, status: 'REJECTED' as const, rejectionReason: 'No coverage' }
    mockedRejectLeave.mockResolvedValue(rejected)

    const { result } = renderHook(() => useTeamLeaves('manager-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.reject(3, { rejectionReason: 'No coverage' })
    })

    expect(mockedRejectLeave).toHaveBeenCalledWith(3, { rejectionReason: 'No coverage' })
    expect(result.current.leaves[0].status).toBe('REJECTED')
  })

  it('sets error state when fetch fails', async () => {
    mockedGetTeamLeavesByManager.mockRejectedValue(new Error('Server error'))
    const { result } = renderHook(() => useTeamLeaves('manager-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('Failed to load team leave requests')
  })
})

describe('useLeaveBalance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fetch when userId is null', () => {
    mockedGetLeaveBalance.mockResolvedValue([])
    const { result } = renderHook(() => useLeaveBalance(null))
    expect(result.current.balances).toEqual([])
    expect(mockedGetLeaveBalance).not.toHaveBeenCalled()
  })

  it('fetches balance on mount', async () => {
    mockedGetLeaveBalance.mockResolvedValue([sampleBalance])
    const { result } = renderHook(() => useLeaveBalance('user-001'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedGetLeaveBalance).toHaveBeenCalledWith('user-001')
    expect(result.current.balances[0].remainingLeaves).toBe(17)
  })
})

describe('useLeaveTypes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches leave types on mount', async () => {
    mockedGetLeaveTypes.mockResolvedValue([sampleLeaveType])
    const { result } = renderHook(() => useLeaveTypes())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockedGetLeaveTypes).toHaveBeenCalledTimes(1)
    expect(result.current.leaveTypes).toHaveLength(1)
    expect(result.current.leaveTypes[0].name).toBe('Annual Leave')
  })
})
