export type DepartmentStatus = 'ACTIVE' | 'INACTIVE'

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'

export interface DepartmentMember {
  id: string
  employeeId: string
  name: string
  email: string
  designation: string | null
  status: EmployeeStatus
}

export interface DepartmentDetail {
  id: number
  name: string
  description: string | null
  headId: string | null
  headName: string | null
  headDesignation: string | null
  status: DepartmentStatus
  memberCount: number
  members: DepartmentMember[] | null
  createdAt: string
  updatedAt: string
}

export interface DepartmentCreateRequest {
  name: string
  description?: string
  headId?: string
}

export interface DepartmentUpdateRequest {
  name?: string
  description?: string
  headId?: string
  status?: DepartmentStatus
}

export interface DepartmentMembersRequest {
  userIds: string[]
}
