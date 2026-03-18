import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  ProjectResponse,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectAssignmentRequest,
  ProjectAssignmentResponse,
  SpringPage,
} from '../types/project.types'

const BASE = '/projects'
const ASSIGN_BASE = '/project-assignments'

const projectService = {
  // ── Projects ─────────────────────────────────────────────────

  async getProjects(page = 0, size = 200): Promise<SpringPage<ProjectResponse>> {
    const { data } = await axiosClient.get<ApiResponse<SpringPage<ProjectResponse>>>(BASE, {
      params: { page, size, sort: 'name,asc' },
    })
    return data.data
  },

  async getProjectById(id: number): Promise<ProjectResponse> {
    const { data } = await axiosClient.get<ApiResponse<ProjectResponse>>(`${BASE}/${id}`)
    return data.data
  },

  async createProject(payload: ProjectCreateRequest): Promise<ProjectResponse> {
    const { data } = await axiosClient.post<ApiResponse<ProjectResponse>>(BASE, payload)
    return data.data
  },

  async updateProject(id: number, payload: ProjectUpdateRequest): Promise<ProjectResponse> {
    const { data } = await axiosClient.put<ApiResponse<ProjectResponse>>(`${BASE}/${id}`, payload)
    return data.data
  },

  /** Soft-archives the project (backend sets status to COMPLETED) */
  async archiveProject(id: number): Promise<ProjectResponse> {
    const { data } = await axiosClient.delete<ApiResponse<ProjectResponse>>(`${BASE}/${id}`)
    return data.data
  },

  // ── Assignments ───────────────────────────────────────────────

  async assignUser(payload: ProjectAssignmentRequest): Promise<ProjectAssignmentResponse> {
    const { data } = await axiosClient.post<ApiResponse<ProjectAssignmentResponse>>(
      ASSIGN_BASE,
      payload,
    )
    return data.data
  },

  async removeAssignment(assignmentId: number): Promise<void> {
    await axiosClient.delete(`${ASSIGN_BASE}/${assignmentId}`)
  },

  async getAssignmentsByProject(
    projectId: number,
  ): Promise<ProjectAssignmentResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<ProjectAssignmentResponse[]>>(
      `${ASSIGN_BASE}/project/${projectId}`,
    )
    return data.data
  },

  async getAssignmentsByUser(userId: string): Promise<ProjectAssignmentResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<ProjectAssignmentResponse[]>>(
      `${ASSIGN_BASE}/user/${userId}`,
    )
    return data.data
  },
}

export default projectService
