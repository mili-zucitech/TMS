import { useMemo, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { NotificationCard } from '../components/NotificationCard'
import { useNotifications } from '../hooks/useNotifications'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterMode = 'ALL' | 'UNREAD'

const PAGE_SIZE = 15

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user } = useAuth()
  const userId = user?.userId ?? null

  const { notifications, isLoading, markRead, markAllRead } = useNotifications(userId)
  const [filter, setFilter] = useState<FilterMode>('ALL')
  const [page, setPage] = useState(0)

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])

  const filtered = useMemo(
    () => (filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, filter],
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleFilterChange = (mode: FilterMode) => {
    setFilter(mode)
    setPage(0)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-lg space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Loading…'
                : unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start sm:self-auto"
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {(['ALL', 'UNREAD'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleFilterChange(mode)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
              'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:transition-colors',
              filter === mode
                ? 'text-primary after:bg-primary'
                : 'text-muted-foreground hover:text-foreground after:bg-transparent',
            )}
          >
            {mode === 'ALL' ? 'All' : 'Unread'}
            {mode === 'UNREAD' && unreadCount > 0 && (
              <Badge variant="default" className="h-[18px] min-w-[18px] px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        // Skeleton loading state
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[68px] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Bell className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium text-muted-foreground">
            {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          {filter === 'UNREAD' && (
            <button
              onClick={() => handleFilterChange('ALL')}
              className="text-sm text-primary hover:underline"
            >
              View all notifications
            </button>
          )}
        </div>
      ) : (
        // Notification list
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border/60">
          {paginated.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => void markRead(id)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} &mdash; {filtered.length} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
