import { Bell, CheckCircle, Calendar, Clock, FolderKanban, ListChecks } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { NotificationResponse, NotificationType } from '../types/notification.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getIcon(type: NotificationType) {
  switch (type) {
    case 'TIMESHEET_SUBMITTED':
    case 'TIMESHEET_APPROVED':
    case 'TIMESHEET_REJECTED':
      return Clock
    case 'LEAVE_APPLIED':
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
      return Calendar
    case 'TASK_ASSIGNED':
      return ListChecks
    case 'PROJECT_ASSIGNED':
      return FolderKanban
    default:
      return Bell
  }
}

function getIconStyle(type: NotificationType): string {
  switch (type) {
    case 'TIMESHEET_APPROVED':
    case 'LEAVE_APPROVED':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
    case 'TIMESHEET_REJECTED':
    case 'LEAVE_REJECTED':
      return 'text-red-600 dark:text-red-400 bg-red-500/10'
    case 'TIMESHEET_SUBMITTED':
    case 'LEAVE_APPLIED':
      return 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
    case 'TASK_ASSIGNED':
      return 'text-violet-600 dark:text-violet-400 bg-violet-500/10'
    case 'PROJECT_ASSIGNED':
      return 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
    default:
      return 'text-muted-foreground bg-muted'
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: NotificationResponse
  onMarkRead?: (id: number) => void
  /** Compact mode: reduced padding, used inside the dropdown */
  compact?: boolean
}

export function NotificationCard({ notification, onMarkRead, compact = false }: NotificationCardProps) {
  const Icon = getIcon(notification.type)

  return (
    <div
      className={cn(
        'flex items-start gap-3 transition-colors',
        compact ? 'px-3 py-2.5' : 'px-5 py-4',
        !notification.isRead ? 'bg-primary/[0.04]' : 'hover:bg-muted/40',
      )}
    >
      {/* Icon bubble */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          getIconStyle(notification.type),
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium leading-snug',
              notification.isRead ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && onMarkRead && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-primary transition-colors"
              title="Mark as read"
              aria-label="Mark as read"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      )}
    </div>
  )
}
