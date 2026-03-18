import axiosClient from '@/api/axiosClient'
import { AUTH_ENDPOINTS } from '@/api/endpoints'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types/api.types'

const authService = {
  /**
   * POST /api/v1/auth/login
   * Returns the unwrapped LoginResponse data on success.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data } = await axiosClient.post<ApiResponse<LoginResponse>>(
      AUTH_ENDPOINTS.login,
      credentials,
    )
    return data.data
  },
}

export default authService

