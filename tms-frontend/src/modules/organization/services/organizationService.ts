import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type { OrganizationDepartment } from '../types/organization.types'

const organizationService = {
  async getDepartments(): Promise<OrganizationDepartment[]> {
    const { data } = await axiosClient.get<ApiResponse<OrganizationDepartment[]>>(
      '/organization/departments',
    )
    return data.data
  },
}

export default organizationService
