import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type { SpringPage, TimesheetResponse, UserResponse } from '../types/notification.types'

/**
 * GET /api/v1/users?size=200&page=0&sort=name
 * Fetches all users in a single large page for manager filtering.
 */
export async function getAllUsers(): Promise<UserResponse[]> {
  const res = await axiosClient.get<ApiResponse<SpringPage<UserResponse>>>('/users', {
    params: { size: 200, page: 0, sort: 'name' },
  })
  return res.data.data.content
}

/**
 * GET /api/v1/timesheets/user/{userId}
 * Returns all timesheets for a given employee.
 * Requires ADMIN/HR role or the current user to be the reporting manager.
 */
export async function getTimesheetsForUser(userId: string): Promise<TimesheetResponse[]> {
  const res = await axiosClient.get<ApiResponse<TimesheetResponse[]>>(
    `/timesheets/user/${userId}`,
  )
  return res.data.data
}
