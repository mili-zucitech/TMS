// ── Notification types ────────────────────────────────────────────────────────
// Mirrors com.company.tms.notification.entity.NotificationType
export type NotificationType =
  | 'TIMESHEET_SUBMITTED'
  | 'TIMESHEET_APPROVED'
  | 'TIMESHEET_REJECTED'
  | 'LEAVE_APPLIED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'TASK_ASSIGNED'
  | 'PROJECT_ASSIGNED'

// Mirrors com.company.tms.notification.dto.NotificationResponse
export interface NotificationResponse {
  id: number
  userId: string
  title: string
  message: string
  type: NotificationType
  /** Java @Getter on a boolean field: Jackson serializes as "read" */
  isRead: boolean
  referenceId: string | null
  referenceType: string | null
  /** ISO-8601 LocalDateTime: "YYYY-MM-DDTHH:mm:ss" */
  createdAt: string
}

// ── User types (for Manager Timesheet page) ───────────────────────────────────
// Mirrors com.company.tms.user.entity.RoleName
export type RoleName = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE'

// Mirrors com.company.tms.user.entity.EmploymentType
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'

// Mirrors com.company.tms.user.entity.UserStatus
export type UserStatus = 'ACTIVE' | 'INACTIVE'

// Mirrors com.company.tms.user.dto.UserResponse
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
  employmentType: EmploymentType
  /** ISO-8601 local date: "YYYY-MM-DD" */
  joiningDate: string
  status: UserStatus
  createdAt: string
  updatedAt: string
}

// ── Timesheet types (for Manager Timesheet page) ──────────────────────────────
// Mirrors com.company.tms.timesheet.entity.TimesheetStatus
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED'

// Mirrors com.company.tms.timesheet.dto.TimesheetResponse
export interface TimesheetResponse {
  id: number
  userId: string
  /** ISO-8601 local date: "YYYY-MM-DD" */
  weekStartDate: string
  /** ISO-8601 local date: "YYYY-MM-DD" */
  weekEndDate: string
  status: TimesheetStatus
  submittedAt: string | null
  approvedAt: string | null
  approvedBy: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

// ── Spring Data Page wrapper ──────────────────────────────────────────────────
export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

// ── Derived UI status for manager table ──────────────────────────────────────
export type EmployeeTimesheetStatus =
  | 'NOT_SUBMITTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'LOCKED'
