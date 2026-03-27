import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  LayoutGrid,
  List,
  Plus,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useAuth } from '@/context/AuthContext'
import { useMyLeaves, useLeaveBalance, useLeaveTypes } from '../hooks/useLeaves'
import { LeaveBalanceCard } from '../components/LeaveBalanceCard'
import { LeaveTable } from '../components/LeaveTable'
import { LeaveCalendar } from '../components/LeaveCalendar'
import { ApplyLeaveModal } from '../components/ApplyLeaveModal'
import { LeaveDetailsDrawer } from '../components/LeaveDetailsDrawer'
import type { LeaveRequestResponse } from '../types/leave.types'
import { useIsMobile } from '@/hooks/useIsMobile'

type ViewMode = 'table' | 'calendar'

function getErrorMessage(err: unknown, fallback: string): string {
  // RTK Query error: { data: { message: string } }
  const rtkMsg = (err as { data?: { message?: string } })?.data?.message
  if (rtkMsg) return rtkMsg
  // Axios error: { response: { data: { message: string } } }
  const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  if (axiosMsg) return axiosMsg
  return fallback
}

export function LeaveDashboardPage() {
  const { user } = useAuth()
  const userId = user?.userId ?? null
  const isMobile = useIsMobile()

  const { leaves, isLoading, error, fetchLeaves, submitLeave, cancel } =
    useMyLeaves(userId)
  const {
    balances,
    isLoading: balancesLoading,
    isInitializing,
    initializeForYear,
  } = useLeaveBalance(userId)
  const { leaveTypes } = useLeaveTypes()

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [applyOpen, setApplyOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestResponse | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMutating, setIsMutating] = useState(false)

  // Auto list on mobile
  useEffect(() => {
    if (isMobile) setViewMode('table')
  }, [isMobile])

  // ── Handlers ───────────────────────────────────────────────

  const handleApply = async (payload: Parameters<typeof submitLeave>[0]) => {
    setIsMutating(true)
    try {
      await submitLeave(payload)
      setApplyOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit leave request'))
    } finally {
      setIsMutating(false)
    }
  }

  const handleCancel = async (leave: LeaveRequestResponse) => {
    setIsMutating(true)
    try {
      await cancel(leave.id)
      setDrawerOpen(false)
    } catch {
      toast.error('Failed to cancel leave request')
    } finally {
      setIsMutating(false)
    }
  }

  const handleView = (leave: LeaveRequestResponse) => {
    setSelectedLeave(leave)
    setDrawerOpen(true)
  }

  // ── Pending count ──────────────────────────────────────────
  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-screen-xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Leave</h1>
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} pending · ${approvedCount} approved`
                : 'Manage your leave requests'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchLeaves} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {!isMobile && (
            <div className="flex items-center rounded-lg border border-border p-1 gap-1">
              <ViewBtn active={viewMode === 'table'} onClick={() => setViewMode('table')}
                icon={<List className="h-4 w-4" />} label="List" />
              <ViewBtn active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}
                icon={<LayoutGrid className="h-4 w-4" />} label="Calendar" />
            </div>
          )}
          <Button onClick={() => setApplyOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Balance Cards */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Leave Balance
        </h2>
        <LeaveBalanceCard
          balances={balances}
          isLoading={balancesLoading}
          isInitializing={isInitializing}
          onInitialize={
            user?.roleName === 'ADMIN' || user?.roleName === 'HR'
              ? () => initializeForYear(new Date().getFullYear())
              : undefined
          }
        />
      </section>

      {/* Leave Requests */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          My Requests
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted" />
              ))}
            </div>
          ) : viewMode === 'calendar' ? (
            <LeaveCalendar leaves={leaves} onSelect={handleView} />
          ) : (
            <LeaveTable
              leaves={leaves}
              showCancel
              onCancel={handleCancel}
              onView={handleView}
            />
          )}
        </div>
      </section>

      {/* Modals */}
      {userId && (
        <ApplyLeaveModal
          open={applyOpen}
          userId={userId}
          leaveTypes={leaveTypes}
          balances={balances}
          onClose={() => setApplyOpen(false)}
          onSubmit={handleApply}
          isLoading={isMutating}
        />
      )}

      <LeaveDetailsDrawer
        leave={selectedLeave}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedLeave(null) }}
        onCancel={handleCancel}
      />
    </div>
  )
}

// ── View toggle button ────────────────────────────────────────

function ViewBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
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
