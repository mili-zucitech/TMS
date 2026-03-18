import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type { DepartmentResponse, SpringPage } from '../types/user.types'

const BASE = '/departments'

const departmentService = {
  async getDepartments(page = 0, size = 200): Promise<SpringPage<DepartmentResponse>> {
    const { data } = await axiosClient.get<ApiResponse<SpringPage<DepartmentResponse>>>(BASE, {
      params: { page, size },
    })
    return data.data
  },
}

export default departmentService
