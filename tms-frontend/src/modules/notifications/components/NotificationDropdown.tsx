import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NotificationCard } from './NotificationCard'
import type { NotificationResponse } from '../types/notification.types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface NotificationDropdownProps {
  notifications: NotificationResponse[]
  onMarkRead: (id: number) => Promise<void>
  onMarkAllRead: () => Promise<void>
  onClose: () => void
}

const PREVIEW_COUNT = 8

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) {
  const navigate = useNavigate()

  const preview = notifications.slice(0, PREVIEW_COUNT)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleViewAll = () => {
    onClose()
    navigate('/notifications')
  }

  return (
    <div className="w-[360px] rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold leading-none">Notifications</span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void onMarkAllRead()}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* ── Notification list ── */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-border/60">
        {preview.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2.5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/70">No notifications to show</p>
          </div>
        ) : (
          preview.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={(id) => void onMarkRead(id)}
              compact
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
          onClick={handleViewAll}
        >
          <span>View all notifications</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
