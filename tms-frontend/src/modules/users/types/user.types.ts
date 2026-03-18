export type RoleName = 'ADMIN' | 'HR' | 'HR_MANAGER' | 'MANAGER' | 'DIRECTOR' | 'EMPLOYEE'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'

export interface UserResponse {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string | null
  departmentId: number | null
  managerId: string | null
  designation: string | null
  roleName: RoleName
  employmentType: EmploymentType | null
  joiningDate: string | null
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface UserCreateRequest {
  name: string
  email: string
  password: string
  phone?: string
  departmentId?: number
  managerId?: string
  designation?: string
  roleName: RoleName
  employmentType?: EmploymentType
  joiningDate?: string
}

export interface UserUpdateRequest {
  name?: string
  phone?: string
  departmentId?: number
  managerId?: string
  designation?: string
  roleName?: RoleName
  employmentType?: EmploymentType
  joiningDate?: string
  status?: UserStatus
}

export type DepartmentStatus = 'ACTIVE' | 'INACTIVE'

export interface DepartmentResponse {
  id: number
  name: string
  description: string | null
  headId: string | null
  status: DepartmentStatus
  createdAt: string
  updatedAt: string
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  /** 0-based */
  number: number
  first: boolean
  last: boolean
  numberOfElements: number
  empty: boolean
}
