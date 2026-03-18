import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  TaskResponse,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskStatusUpdateRequest,
  SpringPage,
} from '../types/task.types'

const BASE = '/tasks'

const taskService = {
  async getTasks(page = 0, size = 50): Promise<SpringPage<TaskResponse>> {
    const { data } = await axiosClient.get<ApiResponse<SpringPage<TaskResponse>>>(BASE, {
      params: { page, size, sort: 'title,asc' },
    })
    return data.data
  },

  async getTaskById(id: number): Promise<TaskResponse> {
    const { data } = await axiosClient.get<ApiResponse<TaskResponse>>(`${BASE}/${id}`)
    return data.data
  },

  async getTasksByProject(projectId: number): Promise<TaskResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<TaskResponse[]>>(
      `${BASE}/project/${projectId}`,
    )
    return data.data
  },

  async getTasksByUser(userId: string): Promise<TaskResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<TaskResponse[]>>(
      `${BASE}/user/${userId}`,
    )
    return data.data
  },

  async createTask(payload: TaskCreateRequest): Promise<TaskResponse> {
    const { data } = await axiosClient.post<ApiResponse<TaskResponse>>(BASE, payload)
    return data.data
  },

  async updateTask(id: number, payload: TaskUpdateRequest): Promise<TaskResponse> {
    const { data } = await axiosClient.put<ApiResponse<TaskResponse>>(`${BASE}/${id}`, payload)
    return data.data
  },

  async updateTaskStatus(id: number, payload: TaskStatusUpdateRequest): Promise<TaskResponse> {
    const { data } = await axiosClient.patch<ApiResponse<TaskResponse>>(
      `${BASE}/${id}/status`,
      payload,
    )
    return data.data
  },

  async deleteTask(id: number): Promise<void> {
    await axiosClient.delete(`${BASE}/${id}`)
  },

  async assignTask(id: number, assignedUserId: string): Promise<TaskResponse> {
    const { data } = await axiosClient.put<ApiResponse<TaskResponse>>(`${BASE}/${id}`, {
      assignedUserId,
    })
    return data.data
  },
}

export default taskService
