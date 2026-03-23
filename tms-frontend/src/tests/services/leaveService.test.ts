import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getLeaveTypes,
  applyLeave,
  getLeavesByUser,
  getTeamLeavesByManager,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveBalance,
  initializeLeaveBalances,
} from '@/modules/leaves/services/leaveService'
import axiosClient from '@/api/axiosClient'

vi.mock('@/api/axiosClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

const mockPost = vi.mocked(axiosClient.post)
const mockGet = vi.mocked(axiosClient.get)

function ok<T>(data: T) {
  return { data: { success: true, data, message: 'OK' } }
}

const sampleLeaveType = {
  id: 1,
  name: 'Annual Leave',
  description: 'Annual paid leave',
  defaultAnnualAllocation: 20,
  requiresApproval: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const sampleLeaveRequest = {
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

describe('leaveService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getLeaveTypes', () => {
    it('gets /leave-types and returns an array', async () => {
      mockGet.mockResolvedValueOnce(ok([sampleLeaveType]))
      const result = await getLeaveTypes()
      expect(mockGet).toHaveBeenCalledWith('/leave-types')
      expect(result).toEqual([sampleLeaveType])
    })
  })

  describe('applyLeave', () => {
    it('posts to /leaves and returns the created leave request', async () => {
      mockPost.mockResolvedValueOnce(ok(sampleLeaveRequest))
      const result = await applyLeave({
        userId: 'user-001',
        leaveTypeId: 1,
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        reason: 'Vacation',
      })
      expect(mockPost).toHaveBeenCalledWith('/leaves', expect.any(Object))
      expect(result.status).toBe('PENDING')
    })
  })

  describe('getLeavesByUser', () => {
    it('gets /leaves/user/:userId and returns leave list', async () => {
      mockGet.mockResolvedValueOnce(ok([sampleLeaveRequest]))
      const result = await getLeavesByUser('user-001')
      expect(mockGet).toHaveBeenCalledWith('/leaves/user/user-001')
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user-001')
    })
  })

  describe('getTeamLeavesByManager', () => {
    it('gets /leaves/manager/:managerId and returns team leave list', async () => {
      const teamLeave = { ...sampleLeaveRequest, userId: 'direct-001', employeeName: 'Jane' }
      mockGet.mockResolvedValueOnce(ok([teamLeave]))
      const result = await getTeamLeavesByManager('manager-001')
      expect(mockGet).toHaveBeenCalledWith('/leaves/manager/manager-001')
      expect(result[0].employeeName).toBe('Jane')
    })
  })

  describe('approveLeave', () => {
    it('posts to /leaves/:id/approve and returns APPROVED status', async () => {
      const approved = { ...sampleLeaveRequest, status: 'APPROVED' as const }
      mockPost.mockResolvedValueOnce(ok(approved))
      const result = await approveLeave(1, { approvedBy: 'mgr-001' })
      expect(mockPost).toHaveBeenCalledWith('/leaves/1/approve', { approvedBy: 'mgr-001' })
      expect(result.status).toBe('APPROVED')
    })

    it('sends empty object when no payload provided', async () => {
      mockPost.mockResolvedValueOnce(ok({ ...sampleLeaveRequest, status: 'APPROVED' as const }))
      await approveLeave(1)
      expect(mockPost).toHaveBeenCalledWith('/leaves/1/approve', {})
    })
  })

  describe('rejectLeave', () => {
    it('posts to /leaves/:id/reject and returns REJECTED status', async () => {
      const rejected = {
        ...sampleLeaveRequest,
        status: 'REJECTED' as const,
        rejectionReason: 'Team at capacity',
      }
      mockPost.mockResolvedValueOnce(ok(rejected))
      const result = await rejectLeave(1, { rejectionReason: 'Team at capacity' })
      expect(mockPost).toHaveBeenCalledWith('/leaves/1/reject', {
        rejectionReason: 'Team at capacity',
      })
      expect(result.status).toBe('REJECTED')
    })
  })

  describe('cancelLeave', () => {
    it('posts to /leaves/:id/cancel and returns CANCELLED status', async () => {
      const cancelled = { ...sampleLeaveRequest, status: 'CANCELLED' as const }
      mockPost.mockResolvedValueOnce(ok(cancelled))
      const result = await cancelLeave(1)
      expect(mockPost).toHaveBeenCalledWith('/leaves/1/cancel')
      expect(result.status).toBe('CANCELLED')
    })
  })

  describe('getLeaveBalance', () => {
    it('gets /leave-balances/user/:userId and returns balance array', async () => {
      mockGet.mockResolvedValueOnce(ok([sampleBalance]))
      const result = await getLeaveBalance('user-001')
      expect(mockGet).toHaveBeenCalledWith('/leave-balances/user/user-001')
      expect(result[0].remainingLeaves).toBe(17)
    })
  })

  describe('initializeLeaveBalances', () => {
    it('posts to /leave-balances/initialize/:year and returns result', async () => {
      mockPost.mockResolvedValueOnce(ok({ year: 2024, recordsCreated: 50 }))
      const result = await initializeLeaveBalances(2024)
      expect(mockPost).toHaveBeenCalledWith('/leave-balances/initialize/2024')
      expect(result.recordsCreated).toBe(50)
    })
  })

  describe('error handling', () => {
    it('propagates 403 errors from the server', async () => {
      const error = Object.assign(new Error('Forbidden'), {
        response: { status: 403, data: { message: 'Insufficient permissions' } },
      })
      mockGet.mockRejectedValueOnce(error)
      await expect(getLeavesByUser('user-001')).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })
})
