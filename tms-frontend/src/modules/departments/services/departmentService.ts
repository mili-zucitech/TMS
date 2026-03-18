import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  DepartmentDetail,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentMembersRequest,
  DepartmentMember,
} from '../types/department.types'

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

const departmentService = {
  async getAll(page = 0, size = 20): Promise<PagedResponse<DepartmentDetail>> {
    const { data } = await axiosClient.get<ApiResponse<PagedResponse<DepartmentDetail>>>(
      '/departments',
      { params: { page, size, sort: 'name' } },
    )
    return data.data
  },

  async getById(id: number): Promise<DepartmentDetail> {
    const { data } = await axiosClient.get<ApiResponse<DepartmentDetail>>(`/departments/${id}`)
    return data.data
  },

  async getMembers(id: number): Promise<DepartmentMember[]> {
    const { data } = await axiosClient.get<ApiResponse<DepartmentMember[]>>(
      `/departments/${id}/members`,
    )
    return data.data
  },

  async create(body: DepartmentCreateRequest): Promise<DepartmentDetail> {
    const { data } = await axiosClient.post<ApiResponse<DepartmentDetail>>('/departments', body)
    return data.data
  },

  async update(id: number, body: DepartmentUpdateRequest): Promise<DepartmentDetail> {
    const { data } = await axiosClient.put<ApiResponse<DepartmentDetail>>(
      `/departments/${id}`,
      body,
    )
    return data.data
  },

  async deleteDepartment(id: number): Promise<void> {
    await axiosClient.delete(`/departments/${id}`)
  },

  async addMembers(id: number, body: DepartmentMembersRequest): Promise<DepartmentDetail> {
    const { data } = await axiosClient.post<ApiResponse<DepartmentDetail>>(
      `/departments/${id}/members`,
      body,
    )
    return data.data
  },

  async removeMember(departmentId: number, userId: string): Promise<void> {
    await axiosClient.delete(`/departments/${departmentId}/members/${userId}`)
  },
}

export default departmentService
