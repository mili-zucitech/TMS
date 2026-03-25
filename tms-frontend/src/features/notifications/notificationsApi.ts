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
    /** Marks ALL notifications for a user as read in one server round-trip. */
    markAllNotificationsRead: builder.mutation<string, string>({
      query: (userId) => ({ url: `/notifications/user/${userId}/read-all`, method: 'PUT', body: {} }),
      invalidatesTags: (_result, _error, userId) => [
        { type: 'Notification', id: userId },
        { type: 'Notification', id: `count-${userId}` },
      ],
    }),
    sendTimesheetReminder: builder.mutation<string, string>({
      query: (userId) => ({ url: `/notifications/remind/${userId}`, method: 'POST', body: {} }),
    }),
    /** Deletes a single notification. Ownership is verified server-side. */
    deleteNotification: builder.mutation<void, { id: number; userId: string }>({
      query: ({ id }) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Notification', id: userId },
        { type: 'Notification', id: `count-${userId}` },
      ],
    }),
    /** Deletes ALL notifications for a user. */
    deleteAllNotifications: builder.mutation<void, string>({
      query: (userId) => ({ url: `/notifications/user/${userId}/all`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, userId) => [
        { type: 'Notification', id: userId },
        { type: 'Notification', id: `count-${userId}` },
      ],
    }),
    /** Deletes the given notification IDs that belong to the user. */
    deleteSelectedNotifications: builder.mutation<void, { userId: string; ids: number[] }>({
      query: ({ userId, ids }) => ({
        url: `/notifications/user/${userId}/batch`,
        method: 'DELETE',
        body: ids,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Notification', id: userId },
        { type: 'Notification', id: `count-${userId}` },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetUserNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useSendTimesheetReminderMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useDeleteSelectedNotificationsMutation,
} = notificationsApi
