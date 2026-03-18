/**
 * Manager Timesheet Service
 *
 * Backend contracts (from TimesheetController + TimeEntryController):
 *
 *  GET  /api/v1/timesheets/{id}                        → TimesheetResponse
 *  GET  /api/v1/timesheets/user/{userId}               → TimesheetResponse[]
 *  POST /api/v1/timesheets/{id}/approve                → TimesheetResponse  (body: { approvedBy?: UUID })
 *  POST /api/v1/timesheets/{id}/reject                 → TimesheetResponse  (body: { approvedBy?: UUID, rejectionReason: string })
 *  GET  /api/v1/time-entries/timesheet/{timesheetId}   → TimeEntryResponse[]
 *  GET  /api/v1/users?page=0&size=500&sort=name,asc    → SpringPage<UserResponse>
 *
 * The backend enforces that MANAGER may only approve/reject timesheets of
 * direct reports — no extra frontend filtering needed for security, but we
 * do client-side filtering so managers only *see* their team's timesheets.
 */
import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type { TimesheetResponse, TimeEntryResponse } from '../../types/timesheet.types'
import type { UserResponse, SpringPage } from '@/modules/users/types/user.types'
import type { ManagerRejectPayload } from '../types/managerTimesheet.types'

const TIMESHEET_BASE = '/timesheets'
const ENTRY_BASE = '/time-entries'
const USERS_BASE = '/users'

const managerTimesheetService = {
  /**
   * Returns all SUBMITTED timesheets visible to the manager.
   * Strategy: load all users whose managerId === currentManagerId, then
   * load each user's timesheets and filter by status === SUBMITTED.
   *
   * The manager's UUID is resolved by the caller from the users list
   * (matching on email from AuthContext).
   */
  async getTeamUsers(managerId: string): Promise<UserResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<SpringPage<UserResponse>>>(USERS_BASE, {
      params: { page: 0, size: 500, sort: 'name,asc' },
    })
    return data.data.content.filter((u) => u.managerId === managerId)
  },

  async getTimesheetsByUser(userId: string): Promise<TimesheetResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<TimesheetResponse[]>>(
      `${TIMESHEET_BASE}/user/${userId}`,
    )
    return data.data
  },

  async getTimesheetById(id: number): Promise<TimesheetResponse> {
    const { data } = await axiosClient.get<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}`,
    )
    return data.data
  },

  async getEntriesByTimesheet(timesheetId: number): Promise<TimeEntryResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<TimeEntryResponse[]>>(
      `${ENTRY_BASE}/timesheet/${timesheetId}`,
    )
    return data.data
  },

  /**
   * Approve a submitted timesheet.
   * Body: { approvedBy?: UUID } — approvedBy is optional on backend.
   */
  async approveTimesheet(
    id: number,
    approverId?: string,
  ): Promise<TimesheetResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}/approve`,
      approverId ? { approvedBy: approverId } : {},
    )
    return data.data
  },

  /**
   * Reject a submitted timesheet.
   * Body: { approvedBy?: UUID, rejectionReason: string }
   */
  async rejectTimesheet(
    id: number,
    payload: ManagerRejectPayload,
  ): Promise<TimesheetResponse> {
    const { data } = await axiosClient.post<ApiResponse<TimesheetResponse>>(
      `${TIMESHEET_BASE}/${id}/reject`,
      payload,
    )
    return data.data
  },

  /** Load all users (for name lookup map in review page). */
  async getAllUsers(): Promise<UserResponse[]> {
    const { data } = await axiosClient.get<ApiResponse<SpringPage<UserResponse>>>(USERS_BASE, {
      params: { page: 0, size: 500, sort: 'name,asc' },
    })
    return data.data.content
  },
}

export default managerTimesheetService
