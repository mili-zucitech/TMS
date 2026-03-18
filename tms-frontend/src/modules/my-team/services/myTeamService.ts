import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type { UserResponse } from '@/modules/users/types/user.types'

const myTeamService = {
  async getTeamMembers(managerId: string): Promise<UserResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<UserResponse[]>>(
      `/users/team/${managerId}`,
    )
    return data.data
  },

  async getDepartmentMembers(departmentId: number): Promise<UserResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<UserResponse[]>>(
      `/users/department/${departmentId}`,
    )
    return data.data
  },
}

export default myTeamService
