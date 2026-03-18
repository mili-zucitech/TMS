// Exact enum values from backend ProjectStatus.java
export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

// Exact enum values from backend ProjectRole.java
export type ProjectRole =
  | 'PROJECT_MANAGER'
  | 'TECH_LEAD'
  | 'DEVELOPER'
  | 'TESTER'
  | 'DESIGNER'
  | 'BUSINESS_ANALYST'
  | 'DEVOPS'
  | 'CONSULTANT'

// Matches ProjectResponse.java
export interface ProjectResponse {
  id: number
  projectCode: string
  name: string
  description: string | null
  clientName: string | null
  departmentId: number | null
  projectManagerId: string | null
  startDate: string | null
  endDate: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

// Matches ProjectCreateRequest.java
export interface ProjectCreateRequest {
  name: string
  description?: string
  clientName?: string
  departmentId?: number
  projectManagerId?: string
  startDate?: string
  endDate?: string
  status?: ProjectStatus
}

// Matches ProjectUpdateRequest.java (projectCode is NOT included — immutable)
export interface ProjectUpdateRequest {
  name?: string
  description?: string
  clientName?: string
  departmentId?: number
  projectManagerId?: string
  startDate?: string
  endDate?: string
  status?: ProjectStatus
}

// Matches ProjectAssignmentRequest.java
export interface ProjectAssignmentRequest {
  projectId: number
  userId: string
  role?: ProjectRole
  allocationPercentage?: number
  startDate?: string
  endDate?: string
}

// Matches ProjectAssignmentResponse.java
export interface ProjectAssignmentResponse {
  id: number
  projectId: number
  userId: string
  role: ProjectRole | null
  allocationPercentage: number | null
  startDate: string | null
  endDate: string | null
  createdAt: string
}

// Reuse SpringPage from user types (same Spring Data structure)
export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  numberOfElements: number
  empty: boolean
}
