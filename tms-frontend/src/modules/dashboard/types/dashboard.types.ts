// ── Re-exported enums mirroring backend ──────────────────────────────────────

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED'
export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type RoleName = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE'
export type UserStatus = 'ACTIVE' | 'INACTIVE'
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT'

// ── Backend response DTOs ─────────────────────────────────────────────────────

export interface TimesheetResponse {
  id: number
  userId: string
  weekStartDate: string
  weekEndDate: string
  status: TimesheetStatus
  submittedAt: string | null
  approvedAt: string | null
  approvedBy: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export interface TimeEntryResponse {
  id: number
  timesheetId: number
  projectId: number | null
  taskId: number | null
  taskNote: string | null
  userId: string
  workDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectResponse {
  id: number
  projectCode: string
  name: string
  description: string | null
  clientName: string | null
  departmentId: number | null
  projectManagerId: string | null
  startDate: string
  endDate: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export interface ProjectAssignmentResponse {
  id: number
  projectId: number
  userId: string
  role: string
  allocationPercentage: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
}

export interface TaskResponse {
  id: number
  taskCode: string
  title: string
  description: string | null
  projectId: number
  assignedUserId: string | null
  priority: string
  status: TaskStatus
  estimatedHours: string | null
  startDate: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface LeaveRequestResponse {
  id: number
  userId: string
  leaveTypeId: number
  leaveTypeName: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: LeaveStatus
  appliedAt: string
  approvedAt: string | null
  approvedBy: string | null
  rejectionReason: string | null
  employeeName: string
}

export interface LeaveBalanceResponse {
  id: number
  userId: string
  leaveTypeId: number
  leaveTypeName: string
  year: number
  totalAllocated: number
  usedLeaves: number
  remainingLeaves: number
  updatedAt: string
}

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
  employmentType: string
  joiningDate: string
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface DepartmentResponse {
  id: number
  name: string
  description: string | null
  headId: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface AuditLogResponse {
  id: number
  userId: string
  action: AuditAction
  entityType: string
  entityId: string
  description: string
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  createdAt: string
}

export interface NotificationResponse {
  id: number
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  referenceId: string | null
  referenceType: string | null
  createdAt: string
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

// ── Derived/computed dashboard types ─────────────────────────────────────────

/** Standard weekly working hours threshold */
export const WEEKLY_HOURS_TARGET = 40

export interface WeeklyTimesheetSummary {
  timesheet: TimesheetResponse | null
  totalMinutes: number
  /** Derived from timesheet.status or 'NOT_SUBMITTED' */
  displayStatus: TimesheetStatus | 'NOT_SUBMITTED'
  weekStart: string
  weekEnd: string
}
