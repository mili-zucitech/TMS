import { useState } from 'react'
import { toast } from 'sonner'
import {
  ClipboardCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useAuth } from '@/context/AuthContext'
import { useTeamLeaves } from '../hooks/useLeaves'
import { RejectLeaveModal } from '../components/RejectLeaveModal'
import { LeaveDetailsDrawer } from '../components/LeaveDetailsDrawer'
import type {
  LeaveRejectRequest,
  LeaveRequestResponse,
  LeaveStatus,
} from '../types/leave.types'
import { LEAVE_STATUS_CONFIG, LEAVE_STATUSES } from '../components/leaveConfig'

export function ManagerLeaveApprovalPage() {
  const { user } = useAuth()
  const userId = user?.userId ?? null

  const { leaves, isLoading, error, fetchLeaves, approve, reject } =
    useTeamLeaves(userId)

  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('PENDING')
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestResponse | null>(null)
  const [viewTarget, setViewTarget] = useState<LeaveRequestResponse | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMutating, setIsMutating] = useState(false)

  // ── Filtered view ──────────────────────────────────────────

  const filtered =
    statusFilter === 'ALL'
      ? leaves
      : leaves.filter((l) => l.status === statusFilter)

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length

  // ── Handlers ───────────────────────────────────────────────

  const handleApprove = async (leave: LeaveRequestResponse) => {
    setIsMutating(true)
    try {
      await approve(leave.id, { approvedBy: userId ?? undefined })
      setDrawerOpen(false)
    } catch {
      toast.error('Failed to approve leave request')
    } finally {
      setIsMutating(false)
    }
  }

  const handleRejectSubmit = async (id: number, rejectionReason: string) => {
    setIsMutating(true)
    try {
      const payload: LeaveRejectRequest = {
        rejectionReason,
        approvedBy: userId ?? undefined,
      }
      await reject(id, payload)
      setRejectTarget(null)
    } catch {
      toast.error('Failed to reject leave request')
    } finally {
      setIsMutating(false)
    }
  }

  const handleView = (leave: LeaveRequestResponse) => {
    setViewTarget(leave)
    setDrawerOpen(true)
  }

  // ── Stats ──────────────────────────────────────────────────

  const stats: { label: string; count: number; status: LeaveStatus }[] = [
    { label: 'Pending', count: leaves.filter((l) => l.status === 'PENDING').length, status: 'PENDING' },
    { label: 'Approved', count: leaves.filter((l) => l.status === 'APPROVED').length, status: 'APPROVED' },
    { label: 'Rejected', count: leaves.filter((l) => l.status === 'REJECTED').length, status: 'REJECTED' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-screen-xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leave Approvals</h1>
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} awaiting review`
                : 'No pending leave requests'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 self-start sm:self-auto" onClick={fetchLeaves} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => {
          const cfg = LEAVE_STATUS_CONFIG[s.status]
          return (
            <button
              key={s.status}
              onClick={() => setStatusFilter(statusFilter === s.status ? 'ALL' : s.status)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all',
                statusFilter === s.status
                  ? cfg.badgeClass + ' ring-2 ring-offset-1'
                  : 'border-border bg-card hover:bg-muted/40',
              )}
            >
              <p className="text-3xl font-bold tabular-nums">{s.count}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </button>
          )
        })}
      </div>

      {/* Table section */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          <TabBtn value="ALL" current={statusFilter} onClick={setStatusFilter} count={leaves.length} />
          {LEAVE_STATUSES.map((s) => (
            <TabBtn
              key={s}
              value={s}
              current={statusFilter}
              onClick={setStatusFilter}
              count={leaves.filter((l) => l.status === s).length}
            />
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <ManagerTable
            leaves={filtered}
            onApprove={handleApprove}
            onReject={setRejectTarget}
            onView={handleView}
            isMutating={isMutating}
          />
        )}
      </div>

      {/* Modals */}
      <RejectLeaveModal
        open={!!rejectTarget}
        leave={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
        isLoading={isMutating}
      />

      <LeaveDetailsDrawer
        leave={viewTarget}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setViewTarget(null) }}
        onApprove={handleApprove}
        onReject={(l) => { setRejectTarget(l); setDrawerOpen(false) }}
      />
    </div>
  )
}

// ── Manager Table ─────────────────────────────────────────────

function ManagerTable({
  leaves,
  onApprove,
  onReject,
  onView,
  isMutating,
}: {
  leaves: LeaveRequestResponse[]
  onApprove: (l: LeaveRequestResponse) => void
  onReject: (l: LeaveRequestResponse) => void
  onView: (l: LeaveRequestResponse) => void
  isMutating: boolean
}) {
  if (leaves.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground text-sm">
        No leave requests found
      </p>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Leave Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">End</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Days</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => {
              const cfg = LEAVE_STATUS_CONFIG[l.status]
              return (
                <tr key={l.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors last:border-0">
                  <td className="px-4 py-3 font-medium text-sm max-w-[140px] truncate">
                    {l.employeeName ?? l.userId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-medium">{l.leaveTypeName}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground text-xs">{fmtDate(l.startDate)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground text-xs">{fmtDate(l.endDate)}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{l.totalDays}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate text-xs">
                    {l.reason ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.badgeClass)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', cfg.dotClass)} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(l)} title="View details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {l.status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={() => onApprove(l)} disabled={isMutating} title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onReject(l)} disabled={isMutating} title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {leaves.map((l) => {
          const cfg = LEAVE_STATUS_CONFIG[l.status]
          return (
            <div key={l.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{l.leaveTypeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
                    <span className="ml-1 font-medium text-foreground">({l.totalDays}d)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.employeeName ?? l.userId.slice(0, 16)}</p>
                </div>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.badgeClass)}>
                  {cfg.label}
                </span>
              </div>
              {l.reason && <p className="text-xs text-muted-foreground">{l.reason}</p>}
              {l.status === 'PENDING' && (
                <div className="flex gap-2 pt-1 border-t border-border/60">
                  <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onApprove(l)} disabled={isMutating}>Approve</Button>
                  <Button size="sm" variant="outline"
                    className="flex-1 h-8 text-xs text-destructive hover:text-destructive border-destructive/30"
                    onClick={() => onReject(l)} disabled={isMutating}>Reject</Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(l)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {l.status !== 'PENDING' && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs w-full" onClick={() => onView(l)}>View details</Button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Tab button ────────────────────────────────────────────────

function TabBtn({
  value, current, onClick, count,
}: { value: LeaveStatus | 'ALL'; current: LeaveStatus | 'ALL'; onClick: (v: LeaveStatus | 'ALL') => void; count: number }) {
  const isActive = value === current
  const cfg = value !== 'ALL' ? LEAVE_STATUS_CONFIG[value] : null
  return (
    <button
      onClick={() => onClick(value)}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5',
        isActive
          ? cfg ? cfg.badgeClass + ' ring-2 ring-offset-1' : 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-muted-foreground/50 bg-background hover:text-foreground',
      )}
    >
      {value === 'ALL' ? 'All' : LEAVE_STATUS_CONFIG[value].label}
      <span className={cn('rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold',
        isActive ? 'bg-black/10 dark:bg-white/20' : 'bg-muted text-muted-foreground')}
      >{count}</span>
    </button>
  )
}

// ── Date helpers ──────────────────────────────────────────────

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
