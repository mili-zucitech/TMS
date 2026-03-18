import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  AuditLogResponse,
  DepartmentResponse,
  LeaveBalanceResponse,
  LeaveRequestResponse,
  NotificationResponse,
  ProjectAssignmentResponse,
  ProjectResponse,
  SpringPage,
  TaskResponse,
  TimeEntryResponse,
  TimesheetResponse,
  UserResponse,
} from '../types/dashboard.types'

// ── User ──────────────────────────────────────────────────────────────────────

/** GET /api/v1/users/{id} */
export async function getUserById(id: string): Promise<UserResponse> {
  const res = await axiosClient.get<ApiResponse<UserResponse>>(`/users/${id}`)
  return res.data.data
}

/** GET /api/v1/users?size=200&page=0 — used for manager/HR aggregate views */
export async function getAllUsers(): Promise<UserResponse[]> {
  const res = await axiosClient.get<ApiResponse<SpringPage<UserResponse>>>('/users', {
    params: { size: 200, page: 0, sort: 'name' },
  })
  return res.data.data.content
}

// ── Timesheets ────────────────────────────────────────────────────────────────

/** GET /api/v1/timesheets/user/{userId} */
export async function getTimesheetsForUser(userId: string): Promise<TimesheetResponse[]> {
  const res = await axiosClient.get<ApiResponse<TimesheetResponse[]>>(
    `/timesheets/user/${userId}`,
  )
  return res.data.data
}

/** GET /api/v1/time-entries/timesheet/{timesheetId} */
export async function getTimeEntriesForTimesheet(timesheetId: number): Promise<TimeEntryResponse[]> {
  const res = await axiosClient.get<ApiResponse<TimeEntryResponse[]>>(
    `/time-entries/timesheet/${timesheetId}`,
  )
  return res.data.data
}

// ── Projects ──────────────────────────────────────────────────────────────────

/** GET /api/v1/projects?size=200&page=0 */
export async function getAllProjects(): Promise<ProjectResponse[]> {
  const res = await axiosClient.get<ApiResponse<SpringPage<ProjectResponse>>>('/projects', {
    params: { size: 200, page: 0, sort: 'name' },
  })
  return res.data.data.content
}

/** GET /api/v1/project-assignments/user/{userId} */
export async function getProjectAssignmentsForUser(userId: string): Promise<ProjectAssignmentResponse[]> {
  const res = await axiosClient.get<ApiResponse<ProjectAssignmentResponse[]>>(
    `/project-assignments/user/${userId}`,
  )
  return res.data.data
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

/** GET /api/v1/tasks?size=200&page=0 — returns tasks for current user if EMPLOYEE */
export async function getMyTasks(): Promise<TaskResponse[]> {
  const res = await axiosClient.get<ApiResponse<SpringPage<TaskResponse>>>('/tasks', {
    params: { size: 200, page: 0 },
  })
  return res.data.data.content
}

// ── Leaves ────────────────────────────────────────────────────────────────────

/** GET /api/v1/leaves/user/{userId} */
export async function getLeavesForUser(userId: string): Promise<LeaveRequestResponse[]> {
  const res = await axiosClient.get<ApiResponse<LeaveRequestResponse[]>>(
    `/leaves/user/${userId}`,
  )
  return res.data.data
}

/** GET /api/v1/leave-balances/user/{userId} */
export async function getLeaveBalancesForUser(userId: string): Promise<LeaveBalanceResponse[]> {
  const res = await axiosClient.get<ApiResponse<LeaveBalanceResponse[]>>(
    `/leave-balances/user/${userId}`,
  )
  return res.data.data
}

/** GET /api/v1/leaves/manager/{managerId} — all team leave requests */
export async function getTeamLeaveRequests(managerId: string): Promise<LeaveRequestResponse[]> {
  const res = await axiosClient.get<ApiResponse<LeaveRequestResponse[]>>(
    `/leaves/manager/${managerId}`,
  )
  return res.data.data
}

// ── Departments ───────────────────────────────────────────────────────────────

/** GET /api/v1/departments?size=200&page=0 */
export async function getAllDepartments(): Promise<DepartmentResponse[]> {
  const res = await axiosClient.get<ApiResponse<SpringPage<DepartmentResponse>>>('/departments', {
    params: { size: 200, page: 0 },
  })
  return res.data.data.content
}

// ── Audit logs ────────────────────────────────────────────────────────────────

/** GET /api/v1/audit-logs — ADMIN only */
export async function getAllAuditLogs(): Promise<AuditLogResponse[]> {
  const res = await axiosClient.get<ApiResponse<AuditLogResponse[]>>('/audit-logs')
  return res.data.data
}

// ── Notifications ─────────────────────────────────────────────────────────────

/** GET /api/v1/notifications/user/{userId} */
export async function getNotificationsForUser(userId: string): Promise<NotificationResponse[]> {
  const res = await axiosClient.get<ApiResponse<NotificationResponse[]>>(
    `/notifications/user/${userId}`,
  )
  return res.data.data
}
