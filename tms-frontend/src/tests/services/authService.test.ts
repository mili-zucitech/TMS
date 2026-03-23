import { describe, it, expect, vi, beforeEach } from 'vitest'
import authService from '@/services/authService'
import axiosClient from '@/api/axiosClient'

// Mock axiosClient so no real HTTP is made
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

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('returns LoginResponse data on a successful call', async () => {
      const accessToken = 'mock.jwt.token'
      mockPost.mockResolvedValueOnce({
        data: {
          success: true,
          data: { accessToken, tokenType: 'Bearer' },
          message: 'Login successful',
        },
      })

      const result = await authService.login({
        email: 'admin@company.com',
        password: 'password123',
      })

      expect(result).toEqual({ accessToken, tokenType: 'Bearer' })
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@company.com',
        password: 'password123',
      })
    })

    it('calls the correct endpoint', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          success: true,
          data: { accessToken: 'tok', tokenType: 'Bearer' },
          message: 'OK',
        },
      })

      await authService.login({ email: 'a@b.com', password: 'pass123' })

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost.mock.calls[0][0]).toBe('/auth/login')
    })

    it('propagates an AxiosError on failure (401)', async () => {
      const error = Object.assign(new Error('Unauthorized'), {
        response: {
          status: 401,
          data: { success: false, data: null, message: 'Invalid credentials' },
        },
      })
      mockPost.mockRejectedValueOnce(error)

      await expect(
        authService.login({ email: 'bad@user.com', password: 'wrongpass' }),
      ).rejects.toMatchObject({ response: { status: 401 } })
    })

    it('propagates a network error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network Error'))

      await expect(
        authService.login({ email: 'a@b.com', password: 'pass123' }),
      ).rejects.toThrow('Network Error')
    })
  })
})
