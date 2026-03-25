import { useMemo, useState } from 'react'
import { Bell, CheckCheck, Trash2, CheckSquare, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
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

  const { notifications, isLoading, markRead, markAllRead, deleteOne, deleteAll, deleteSelected } =
    useNotifications(userId)

  const [filter, setFilter] = useState<FilterMode>('ALL')
  const [page, setPage] = useState(0)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])

  const filtered = useMemo(
    () => (filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, filter],
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleSelection = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const allPageSelected =
    paginated.length > 0 && paginated.every((n) => selectedIds.has(n.id))

  const somePageSelected = paginated.some((n) => selectedIds.has(n.id))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paginated.forEach((n) => next.delete(n.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paginated.forEach((n) => next.add(n.id))
        return next
      })
    }
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleFilterChange = (mode: FilterMode) => {
    setFilter(mode)
    setPage(0)
    exitSelectMode()
  }

  const handleDeleteOne = async (id: number) => {
    await deleteOne(id)
  }

  const handleDeleteSelected = async () => {
    setIsDeleting(true)
    try {
      await deleteSelected(Array.from(selectedIds))
      exitSelectMode()
    } finally {
      setIsDeleting(false)
      setConfirmDeleteSelected(false)
    }
  }

  const handleDeleteAll = async () => {
    setIsDeleting(true)
    try {
      await deleteAll()
      exitSelectMode()
    } finally {
      setIsDeleting(false)
      setConfirmDeleteAll(false)
    }
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

        {/* Toolbar actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {selectMode ? (
            <>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => setConfirmDeleteSelected(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete selected ({selectedIds.size})
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={exitSelectMode}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => void markAllRead()}
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setSelectMode(true)}
                  >
                    <CheckSquare className="h-4 w-4" />
                    Select
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => setConfirmDeleteAll(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete all
                  </Button>
                </>
              )}
            </>
          )}
        </div>
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
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[68px] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
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
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border/60">
          {/* Select-all row */}
          {selectMode && (
            <div className="flex items-center gap-3 px-5 py-3 bg-muted/30 border-b border-border">
              <Checkbox
                checked={allPageSelected}
                data-state={somePageSelected && !allPageSelected ? 'indeterminate' : undefined}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all on this page"
              />
              <span className="text-xs text-muted-foreground">
                {allPageSelected
                  ? 'All on this page selected'
                  : somePageSelected
                    ? `${selectedIds.size} selected`
                    : 'Select all on this page'}
              </span>
            </div>
          )}
          {paginated.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={selectMode ? undefined : (id) => void markRead(id)}
              onDelete={selectMode ? undefined : (id) => void handleDeleteOne(id)}
              selectable={selectMode}
              isSelected={selectedIds.has(notification.id)}
              onSelectionChange={toggleSelection}
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

      {/* ── Confirm Delete Selected dialog ── */}
      <Dialog open={confirmDeleteSelected} onOpenChange={setConfirmDeleteSelected}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} notification{selectedIds.size !== 1 ? 's' : ''}?</DialogTitle>
            <DialogDescription>
              The selected notification{selectedIds.size !== 1 ? 's' : ''} will be permanently removed.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteSelected(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteSelected()} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete All dialog ── */}
      <Dialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all notifications?</DialogTitle>
            <DialogDescription>
              All {notifications.length} notification{notifications.length !== 1 ? 's' : ''} will be
              permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAll(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteAll()} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
