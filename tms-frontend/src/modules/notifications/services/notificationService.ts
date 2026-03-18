import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type { NotificationResponse } from '../types/notification.types'

const BASE = '/notifications'

/** GET /api/v1/notifications/user/{userId} */
export async function getUserNotifications(userId: string): Promise<NotificationResponse[]> {
  const res = await axiosClient.get<ApiResponse<NotificationResponse[]>>(
    `${BASE}/user/${userId}`,
  )
  return res.data.data
}

/** GET /api/v1/notifications/user/{userId}/unread-count */
export async function getUnreadCount(userId: string): Promise<number> {
  const res = await axiosClient.get<ApiResponse<number>>(
    `${BASE}/user/${userId}/unread-count`,
  )
  return res.data.data
}

/** PUT /api/v1/notifications/{id}/read */
export async function markAsRead(id: number): Promise<NotificationResponse> {
  const res = await axiosClient.put<ApiResponse<NotificationResponse>>(`${BASE}/${id}/read`)
  return res.data.data
}

/** POST /api/v1/notifications/remind/{userId} — MANAGER/ADMIN only */
export async function sendTimesheetReminder(userId: string): Promise<string> {
  const res = await axiosClient.post<ApiResponse<string>>(`${BASE}/remind/${userId}`)
  return res.data.data
}
