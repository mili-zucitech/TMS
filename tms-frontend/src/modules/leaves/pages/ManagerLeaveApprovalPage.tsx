import { useState } from 'react'
import { toast } from 'sonner'
import {
  ClipboardList,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Users,
  Search,
  Filter,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
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
import { LEAVE_STATUS_CONFIG } from '../components/leaveConfig'

const STATUS_TABS: { value: LeaveStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export function ManagerLeaveApprovalPage() {
  const { user } = useAuth()
  const userId = user?.userId ?? null

  const { leaves, isLoading, error, fetchLeaves, approve, reject } =
    useTeamLeaves(userId)

  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('PENDING')
  const [search, setSearch] = useState('')
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestResponse | null>(null)
  const [viewTarget, setViewTarget] = useState<LeaveRequestResponse | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMutating, setIsMutating] = useState(false)

  // â”€â”€ Filtered view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const filtered = leaves.filter((l) => {
    const matchStatus = statusFilter === 'ALL' || l.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (l.employeeName ?? '').toLowerCase().includes(q) ||
      l.leaveTypeName.toLowerCase().includes(q) ||
      (l.reason ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const pendingCount  = leaves.filter((l) => l.status === 'PENDING').length
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      const payload: LeaveRejectRequest = { rejectionReason, approvedBy: userId ?? undefined }
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leave Approvals</h1>
              <p className="text-sm text-muted-foreground">
                {pendingCount > 0
                  ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} awaiting your review`
                  : 'No pending leave requests'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => void fetchLeaves()}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}        label="Total Requests" value={leaves.length}   iconClassName="from-violet-500 to-purple-600 shadow-violet-500/20" />
          <StatCard icon={Clock}        label="Pending Review" value={pendingCount}    iconClassName="from-amber-500 to-orange-500 shadow-amber-500/20" />
          <StatCard icon={CheckCircle2} label="Approved"       value={approvedCount}   iconClassName="from-emerald-500 to-teal-600 shadow-emerald-500/20" />
          <StatCard icon={XCircle}      label="Rejected"       value={rejectedCount}   iconClassName="from-red-500 to-rose-600 shadow-red-500/20" />
        </div>

        {/* â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => void fetchLeaves()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by employee, leave type, or reasonâ€¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>
          {/* Status tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === 'ALL'
                  ? leaves.length
                  : leaves.filter((l) => l.status === tab.value).length
              const isActive = statusFilter === tab.value
              const cfg = tab.value !== 'ALL' ? LEAVE_STATUS_CONFIG[tab.value] : null
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                    isActive
                      ? cfg
                        ? cfg.badgeClass
                        : 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/50 bg-background hover:text-foreground',
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold',
                    isActive ? 'bg-black/10 dark:bg-white/20' : 'bg-muted',
                  )}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* â”€â”€ Loading skeletons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {/* â”€â”€ Desktop table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!isLoading && (
          <div className="hidden sm:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Leave Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Period</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Reason</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
                      {leaves.length === 0 ? 'No leave requests for your team yet.' : 'No results match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const cfg = LEAVE_STATUS_CONFIG[l.status]
                    const initials = (l.employeeName ?? '?')
                      .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <tr
                        key={l.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0"
                      >
                        {/* Employee */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[11px] font-bold text-white select-none">
                              {initials}
                            </div>
                            <span className="font-medium truncate max-w-[140px]">
                              {l.employeeName ?? l.userId.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        {/* Leave Type */}
                        <td className="px-4 py-3 font-medium text-sm">{l.leaveTypeName}</td>
                        {/* Period */}
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(l.startDate)}
                          {l.startDate !== l.endDate && (
                            <> &ndash; {fmtDate(l.endDate)}</>
                          )}
                        </td>
                        {/* Days */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center rounded-lg bg-muted px-2.5 py-1 text-xs font-bold tabular-nums">
                            {l.totalDays}d
                          </span>
                        </td>
                        {/* Reason */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground max-w-[180px] line-clamp-1 block">
                            {l.reason ?? <span className="italic">No reason provided</span>}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                            cfg.badgeClass,
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotClass)} />
                            {cfg.label}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleView(l)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {l.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                  onClick={() => void handleApprove(l)}
                                  disabled={isMutating}
                                  title="Approve"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setRejectTarget(l)}
                                  disabled={isMutating}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* â”€â”€ Mobile cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!isLoading && (
          <div className="sm:hidden space-y-3">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {leaves.length === 0 ? 'No leave requests for your team yet.' : 'No results match your filters.'}
              </p>
            ) : (
              filtered.map((l) => {
                const cfg = LEAVE_STATUS_CONFIG[l.status]
                const initials = (l.employeeName ?? '?')
                  .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <div key={l.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[11px] font-bold text-white select-none">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {l.employeeName ?? l.userId.slice(0, 16)}
                          </p>
                          <p className="text-xs text-muted-foreground">{l.leaveTypeName}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        cfg.badgeClass,
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotClass)} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Date + days */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{fmtDate(l.startDate)}{l.startDate !== l.endDate && ` \u2013 ${fmtDate(l.endDate)}`}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 font-bold text-foreground">{l.totalDays}d</span>
                    </div>

                    {/* Reason */}
                    {l.reason && (
                      <p className="text-xs text-muted-foreground line-clamp-2 border-l-2 border-border pl-2">
                        {l.reason}
                      </p>
                    )}

                    {/* Actions */}
                    {l.status === 'PENDING' ? (
                      <div className="flex gap-2 pt-1 border-t border-border/60">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
                          onClick={() => void handleApprove(l)}
                          disabled={isMutating}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => setRejectTarget(l)}
                          disabled={isMutating}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground"
                          onClick={() => handleView(l)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-full text-xs text-muted-foreground"
                        onClick={() => handleView(l)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View details
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>

      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

// â”€â”€ Date helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
