import { useCallback } from 'react'
import {
  useGetUserNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
} from '@/features/notifications/notificationsApi'

// ── useNotifications ──────────────────────────────────────────────────────────

export function useNotifications(userId: string | null) {
  const {
    data: notifications = [],
    isLoading,
    refetch: refresh,
  } = useGetUserNotificationsQuery(userId!, { skip: !userId })

  const [markNotificationReadMutation] = useMarkNotificationReadMutation()

  const markRead = useCallback(
    async (id: number) => {
      if (!userId) return
      await markNotificationReadMutation({ id, userId }).unwrap()
    },
    [markNotificationReadMutation, userId],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const unread = notifications.filter((n) => !n.isRead)
    if (unread.length === 0) return
    await Promise.all(unread.map((n) => markNotificationReadMutation({ id: n.id, userId }).unwrap()))
  }, [markNotificationReadMutation, notifications, userId])

  return { notifications, isLoading, refresh, markRead, markAllRead }
}

// ── useUnreadCount ────────────────────────────────────────────────────────────

export function useUnreadCount(userId: string | null) {
  const { data: count = 0, refetch: refresh } = useGetUnreadCountQuery(userId!, {
    skip: !userId,
    pollingInterval: 30_000,
  })
  return { count, refresh }
}
