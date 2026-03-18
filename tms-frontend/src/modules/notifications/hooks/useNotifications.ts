import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getUserNotifications,
  getUnreadCount as fetchUnreadCount,
  markAsRead as markSingleRead,
} from '../services/notificationService'
import type { NotificationResponse } from '../types/notification.types'

const POLL_INTERVAL_MS = 30_000

// ── useNotifications ──────────────────────────────────────────────────────────

/**
 * Loads and manages the full notification list for a user.
 * Provides markRead / markAllRead helpers that optimistically update local state.
 */
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const data = await getUserNotifications(userId)
      setNotifications(data)
    } catch {
      // Non-critical — fail silently; the app should not break if notifications fail
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const markRead = useCallback(async (id: number) => {
    await markSingleRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )
  }, [])

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead)
    if (unread.length === 0) return
    await Promise.all(unread.map((n) => markSingleRead(n.id)))
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }, [notifications])

  return { notifications, isLoading, refresh: load, markRead, markAllRead }
}

// ── useUnreadCount ────────────────────────────────────────────────────────────

/**
 * Polls the unread notification count every 30 seconds.
 * Used by the Navbar bell badge.
 */
export function useUnreadCount(userId: string | null) {
  const [count, setCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const c = await fetchUnreadCount(userId)
      setCount(c)
    } catch {
      // Non-critical — fail silently
    }
  }, [userId])

  useEffect(() => {
    void refresh()
    intervalRef.current = setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  return { count, refresh }
}
