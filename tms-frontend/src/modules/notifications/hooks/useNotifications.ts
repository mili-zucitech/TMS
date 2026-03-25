import { useCallback } from 'react'
import {
  useGetUserNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useDeleteSelectedNotificationsMutation,
} from '@/features/notifications/notificationsApi'

// ── useNotifications ──────────────────────────────────────────────────────────

export function useNotifications(userId: string | null) {
  const {
    data: notifications = [],
    isLoading,
    refetch: refresh,
  } = useGetUserNotificationsQuery(userId!, { skip: !userId })

  const [markNotificationReadMutation] = useMarkNotificationReadMutation()
  const [markAllNotificationsReadMutation] = useMarkAllNotificationsReadMutation()
  const [deleteNotificationMutation] = useDeleteNotificationMutation()
  const [deleteAllNotificationsMutation] = useDeleteAllNotificationsMutation()
  const [deleteSelectedNotificationsMutation] = useDeleteSelectedNotificationsMutation()

  const markRead = useCallback(
    async (id: number) => {
      if (!userId) return
      await markNotificationReadMutation({ id, userId }).unwrap()
    },
    [markNotificationReadMutation, userId],
  )

  /** Marks all notifications as read in a single server request (efficient bulk update). */
  const markAllRead = useCallback(async () => {
    if (!userId) return
    await markAllNotificationsReadMutation(userId).unwrap()
  }, [markAllNotificationsReadMutation, userId])

  /** Deletes a single notification by ID. */
  const deleteOne = useCallback(
    async (id: number) => {
      if (!userId) return
      await deleteNotificationMutation({ id, userId }).unwrap()
    },
    [deleteNotificationMutation, userId],
  )

  /** Deletes ALL notifications for the current user. */
  const deleteAll = useCallback(async () => {
    if (!userId) return
    await deleteAllNotificationsMutation(userId).unwrap()
  }, [deleteAllNotificationsMutation, userId])

  /** Deletes the specified notification IDs for the current user. */
  const deleteSelected = useCallback(
    async (ids: number[]) => {
      if (!userId || ids.length === 0) return
      await deleteSelectedNotificationsMutation({ userId, ids }).unwrap()
    },
    [deleteSelectedNotificationsMutation, userId],
  )

  return { notifications, isLoading, refresh, markRead, markAllRead, deleteOne, deleteAll, deleteSelected }
}

// ── useUnreadCount ────────────────────────────────────────────────────────────

export function useUnreadCount(userId: string | null) {
  const { data: count = 0, refetch: refresh } = useGetUnreadCountQuery(userId!, {
    skip: !userId,
    pollingInterval: 30_000,
  })
  return { count, refresh }
}
