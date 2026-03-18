import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  UserResponse,
  UserCreateRequest,
  UserUpdateRequest,
  SpringPage,
} from '../types/user.types'

const BASE = '/users'

const userModuleService = {
  async getUsers(page = 0, size = 200): Promise<SpringPage<UserResponse>> {
    const { data } = await axiosClient.get<ApiResponse<SpringPage<UserResponse>>>(BASE, {
      params: { page, size, sort: 'name,asc' },
    })
    return data.data
  },

  async getUserById(id: string): Promise<UserResponse> {
    const { data } = await axiosClient.get<ApiResponse<UserResponse>>(`${BASE}/${id}`)
    return data.data
  },

  async createUser(payload: UserCreateRequest): Promise<UserResponse> {
    const { data } = await axiosClient.post<ApiResponse<UserResponse>>(BASE, payload)
    return data.data
  },

  async updateUser(id: string, payload: UserUpdateRequest): Promise<UserResponse> {
    const { data } = await axiosClient.put<ApiResponse<UserResponse>>(`${BASE}/${id}`, payload)
    return data.data
  },

  async deactivateUser(id: string): Promise<void> {
    await axiosClient.delete(`${BASE}/${id}`)
  },
}

export default userModuleService
