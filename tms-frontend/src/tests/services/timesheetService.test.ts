import { describe, it, expect, vi, beforeEach } from 'vitest'
import timesheetService from '@/modules/timesheets/services/timesheetService'
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
const mockPut = vi.mocked(axiosClient.put)
const mockDelete = vi.mocked(axiosClient.delete)

const sampleTimesheet = {
  id: 1,
  userId: 'user-uuid-001',
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
  userId: 'user-uuid-001',
  workDate: '2024-01-02',
  startTime: '09:00:00',
  endTime: '17:00:00',
  durationMinutes: 480,
  description: 'Development work',
  createdAt: '2024-01-02T09:00:00Z',
  updatedAt: '2024-01-02T17:00:00Z',
}

function okResponse<T>(data: T) {
  return { data: { success: true, data, message: 'OK' } }
}

describe('timesheetService', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Timesheets ────────────────────────────────────────────────────────────

  describe('createTimesheet', () => {
    it('posts to /timesheets and returns the created timesheet', async () => {
      mockPost.mockResolvedValueOnce(okResponse(sampleTimesheet))
      const result = await timesheetService.createTimesheet({
        userId: 'user-uuid-001',
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
      })
      expect(mockPost).toHaveBeenCalledWith('/timesheets', expect.any(Object))
      expect(result).toEqual(sampleTimesheet)
    })
  })

  describe('getTimesheetById', () => {
    it('gets /timesheets/:id and returns the timesheet', async () => {
      mockGet.mockResolvedValueOnce(okResponse(sampleTimesheet))
      const result = await timesheetService.getTimesheetById(1)
      expect(mockGet).toHaveBeenCalledWith('/timesheets/1')
      expect(result).toEqual(sampleTimesheet)
    })
  })

  describe('getTimesheetsByUser', () => {
    it('gets /timesheets/user/:userId and returns an array', async () => {
      mockGet.mockResolvedValueOnce(okResponse([sampleTimesheet]))
      const result = await timesheetService.getTimesheetsByUser('user-uuid-001')
      expect(mockGet).toHaveBeenCalledWith('/timesheets/user/user-uuid-001')
      expect(result).toEqual([sampleTimesheet])
    })

    it('returns an empty array when the user has no timesheets', async () => {
      mockGet.mockResolvedValueOnce(okResponse([]))
      const result = await timesheetService.getTimesheetsByUser('user-uuid-001')
      expect(result).toEqual([])
    })
  })

  describe('submitTimesheet', () => {
    it('posts to /timesheets/:id/submit and returns the updated timesheet', async () => {
      const submitted = { ...sampleTimesheet, status: 'SUBMITTED' as const }
      mockPost.mockResolvedValueOnce(okResponse(submitted))
      const result = await timesheetService.submitTimesheet(1)
      expect(mockPost).toHaveBeenCalledWith('/timesheets/1/submit')
      expect(result.status).toBe('SUBMITTED')
    })
  })

  describe('approveTimesheet', () => {
    it('posts to /timesheets/:id/approve and returns APPROVED status', async () => {
      const approved = { ...sampleTimesheet, status: 'APPROVED' as const }
      mockPost.mockResolvedValueOnce(okResponse(approved))
      const result = await timesheetService.approveTimesheet(1, { approvedBy: 'mgr-uuid' })
      expect(mockPost).toHaveBeenCalledWith('/timesheets/1/approve', { approvedBy: 'mgr-uuid' })
      expect(result.status).toBe('APPROVED')
    })

    it('posts empty object when no payload is provided', async () => {
      mockPost.mockResolvedValueOnce(okResponse({ ...sampleTimesheet, status: 'APPROVED' as const }))
      await timesheetService.approveTimesheet(1)
      expect(mockPost).toHaveBeenCalledWith('/timesheets/1/approve', {})
    })
  })

  describe('rejectTimesheet', () => {
    it('posts to /timesheets/:id/reject and returns REJECTED status', async () => {
      const rejected = { ...sampleTimesheet, status: 'REJECTED' as const, rejectionReason: 'Bad data' }
      mockPost.mockResolvedValueOnce(okResponse(rejected))
      const result = await timesheetService.rejectTimesheet(1, {
        rejectionReason: 'Bad data',
      })
      expect(mockPost).toHaveBeenCalledWith('/timesheets/1/reject', {
        rejectionReason: 'Bad data',
      })
      expect(result.status).toBe('REJECTED')
      expect(result.rejectionReason).toBe('Bad data')
    })
  })

  describe('lockTimesheet', () => {
    it('posts to /timesheets/:id/lock and returns LOCKED status', async () => {
      const locked = { ...sampleTimesheet, status: 'LOCKED' as const }
      mockPost.mockResolvedValueOnce(okResponse(locked))
      const result = await timesheetService.lockTimesheet(1)
      expect(mockPost).toHaveBeenCalledWith('/timesheets/1/lock')
      expect(result.status).toBe('LOCKED')
    })
  })

  // ── Time Entries ──────────────────────────────────────────────────────────

  describe('createTimeEntry', () => {
    it('posts to /time-entries and returns the created entry', async () => {
      mockPost.mockResolvedValueOnce(okResponse(sampleEntry))
      const result = await timesheetService.createTimeEntry({
        timesheetId: 1,
        projectId: 5,
        userId: 'user-uuid-001',
        workDate: '2024-01-02',
        startTime: '09:00',
        endTime: '17:00',
      })
      expect(mockPost).toHaveBeenCalledWith('/time-entries', expect.any(Object))
      expect(result).toEqual(sampleEntry)
    })
  })

  describe('updateTimeEntry', () => {
    it('puts to /time-entries/:id and returns updated entry', async () => {
      const updated = { ...sampleEntry, description: 'Updated desc' }
      mockPut.mockResolvedValueOnce(okResponse(updated))
      const result = await timesheetService.updateTimeEntry(100, {
        description: 'Updated desc',
      })
      expect(mockPut).toHaveBeenCalledWith('/time-entries/100', {
        description: 'Updated desc',
      })
      expect(result.description).toBe('Updated desc')
    })
  })

  describe('deleteTimeEntry', () => {
    it('sends DELETE to /time-entries/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })
      await timesheetService.deleteTimeEntry(100)
      expect(mockDelete).toHaveBeenCalledWith('/time-entries/100')
    })
  })

  describe('error handling', () => {
    it('propagates errors from the axios client', async () => {
      const error = Object.assign(new Error('Not Found'), {
        response: { status: 404, data: { message: 'Timesheet not found' } },
      })
      mockGet.mockRejectedValueOnce(error)
      await expect(timesheetService.getTimesheetById(999)).rejects.toMatchObject({
        response: { status: 404 },
      })
    })
  })
})
