export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'

export interface EmployeeSummary {
  id: string
  employeeId: string
  name: string
  email: string
  designation: string | null
  status: EmployeeStatus
}

export interface OrganizationDepartment {
  id: number
  name: string
  description: string | null
  employees: EmployeeSummary[]
}

// ── Hierarchy types (4-level view: Org → Dept → Manager → Team) ──────────────

export interface HierarchyMember {
  id: string
  employeeId: string
  name: string
  email: string
  designation: string | null
  status: EmployeeStatus
  roleName: string
}

export interface HierarchyManager {
  user: HierarchyMember
  directReports: HierarchyMember[]
}

export interface HierarchyDepartment {
  id: number
  name: string
  description: string | null
  managers: HierarchyManager[]
  /** Members in this dept whose manager is not in this dept (or has no manager) */
  unassigned: HierarchyMember[]
}
