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
