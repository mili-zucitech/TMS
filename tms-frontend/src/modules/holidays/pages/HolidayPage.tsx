import { useEffect, useState } from 'react'
import { CalendarCheck, LayoutGrid, List, Plus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { cn } from '@/utils/cn'
import { useAuth } from '@/context/AuthContext'
import { useHolidays } from '../hooks/useHolidays'
import { HolidayCalendar } from '../components/HolidayCalendar'
import { HolidayTable } from '../components/HolidayTable'
import { HolidayCreateModal } from '../components/HolidayCreateModal'
import { HolidayEditModal } from '../components/HolidayEditModal'
import type { HolidayCreateRequest, HolidayResponse, HolidayUpdateRequest, HolidayViewMode } from '../types/holiday.types'
import { HOLIDAY_ADMIN_ROLES } from '../components/holidayConfig'
import { useIsMobile } from '@/hooks/useIsMobile'

// ── Page ─────────────────────────────────────────────────────

export function HolidayPage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const canManage = HOLIDAY_ADMIN_ROLES.includes(
    user?.roleName as (typeof HOLIDAY_ADMIN_ROLES)[number],
  )

  const { holidays, isLoading, error, addHoliday, editHoliday, removeHoliday } =
    useHolidays()

  // Auto-switch to list view on mobile
  const [viewMode, setViewMode] = useState<HolidayViewMode>(
    () => (window.innerWidth < 768 ? 'list' : 'calendar'),
  )

  // Modal states
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HolidayResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HolidayResponse | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  // Switch to list on mobile resize
  useEffect(() => {
    if (isMobile) setViewMode('list')
  }, [isMobile])

  // ── Handlers ───────────────────────────────────────────────

  const handleCreate = async (data: HolidayCreateRequest) => {
    setIsMutating(true)
    try {
      await addHoliday(data)
      setCreateOpen(false)
    } catch {
      toast.error('Failed to create holiday')
    } finally {
      setIsMutating(false)
    }
  }

  const handleEdit = async (id: number, data: HolidayUpdateRequest) => {
    setIsMutating(true)
    try {
      await editHoliday(id, data)
      setEditTarget(null)
    } catch {
      toast.error('Failed to update holiday')
    } finally {
      setIsMutating(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsMutating(true)
    try {
      await removeHoliday(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete holiday')
    } finally {
      setIsMutating(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-screen-xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Holidays</h1>
            <p className="text-sm text-muted-foreground">
              {holidays.length > 0
                ? `${holidays.length} holidays scheduled`
                : 'Manage company and public holidays'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          {!isMobile && (
            <div className="flex items-center rounded-lg border border-border p-1 gap-1">
              <ViewToggleBtn
                active={viewMode === 'calendar'}
                onClick={() => setViewMode('calendar')}
                icon={<LayoutGrid className="h-4 w-4" />}
                label="Calendar"
              />
              <ViewToggleBtn
                active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                icon={<List className="h-4 w-4" />}
                label="List"
              />
            </div>
          )}

          {canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          {viewMode === 'calendar' ? (
            <HolidayCalendar
              holidays={holidays}
              canManage={canManage}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ) : (
            <HolidayTable
              holidays={holidays}
              canManage={canManage}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      <HolidayCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isLoading={isMutating}
      />

      <HolidayEditModal
        open={!!editTarget}
        holiday={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        isLoading={isMutating}
      />

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Holiday
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isMutating}
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function ViewToggleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
        active
          ? 'bg-background shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 rounded bg-muted/60" />
        ))}
      </div>
    </div>
  )
}
