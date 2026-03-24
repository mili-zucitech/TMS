import { baseApi } from '@/store/baseApi'
import type { NotificationResponse } from '@/modules/notifications/types/notification.types'

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserNotifications: builder.query<NotificationResponse[], string>({
      query: (userId) => `/notifications/user/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'Notification', id: userId }],
    }),
    getUnreadCount: builder.query<number, string>({
      query: (userId) => `/notifications/user/${userId}/unread-count`,
      providesTags: (_result, _error, userId) => [{ type: 'Notification', id: `count-${userId}` }],
    }),
    markNotificationRead: builder.mutation<NotificationResponse, { id: number; userId: string }>({
      query: ({ id }) => ({ url: `/notifications/${id}/read`, method: 'PUT', body: {} }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Notification', id: userId },
        { type: 'Notification', id: `count-${userId}` },
      ],
    }),
    sendTimesheetReminder: builder.mutation<string, string>({
      query: (userId) => ({ url: `/notifications/remind/${userId}`, method: 'POST', body: {} }),
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetUserNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useSendTimesheetReminderMutation,
} = notificationsApi
