import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  Search,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import type { LeaveRequestResponse, LeaveStatus } from '../types/leave.types'
import { LEAVE_STATUS_CONFIG, LEAVE_STATUSES } from './leaveConfig'

// ── Types ─────────────────────────────────────────────────────

interface LeaveTableProps {
  leaves: LeaveRequestResponse[]
  /** Show cancel action on each row */
  showCancel?: boolean
  onCancel?: (leave: LeaveRequestResponse) => void
  onView?: (leave: LeaveRequestResponse) => void
  /** Extra columns for manager view */
  showEmployee?: boolean
}

type SortKey = 'leaveTypeName' | 'startDate' | 'totalDays' | 'status' | 'appliedAt'
type SortDir = 'asc' | 'desc'

const PAGE_SIZES = [10, 20, 50]

// ── Component ────────────────────────────────────────────────

export function LeaveTable({
  leaves,
  showCancel = false,
  onCancel,
  onView,
  showEmployee = false,
}: LeaveTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('appliedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leaves
      .filter((l) => {
        const matchSearch =
          l.leaveTypeName.toLowerCase().includes(q) ||
          (l.reason ?? '').toLowerCase().includes(q) ||
          (l.userId ?? '').toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || l.status === statusFilter
        return matchSearch && matchStatus
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'leaveTypeName') cmp = a.leaveTypeName.localeCompare(b.leaveTypeName)
        else if (sortKey === 'startDate') cmp = a.startDate.localeCompare(b.startDate)
        else if (sortKey === 'totalDays') cmp = a.totalDays - b.totalDays
        else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
        else if (sortKey === 'appliedAt') cmp = a.appliedAt.localeCompare(b.appliedAt)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [leaves, search, statusFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const handleStatusFilter = (s: LeaveStatus | 'ALL') => {
    setStatusFilter(s)
    setPage(0)
  }

  return (
    <div className="space-y-3">
      {/* ── Filters ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by type, reason…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatusFilterBtn value="ALL" current={statusFilter} onClick={handleStatusFilter} />
          {LEAVE_STATUSES.map((s) => (
            <StatusFilterBtn key={s} value={s} current={statusFilter} onClick={handleStatusFilter} />
          ))}
        </div>
      </div>

      {/* ── Desktop Table ─────────────────────────────────── */}
      <div className="hidden sm:block rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {showEmployee && (
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    User ID
                  </th>
                )}
                <SortTh label="Leave Type" k="leaveTypeName" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Start Date" k="startDate" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">End Date</th>
                <SortTh label="Days" k="totalDays" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Status" k="status" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Applied" k="appliedAt" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={showEmployee ? 8 : 7} className="px-4 py-10 text-center text-muted-foreground">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                paginated.map((leave) => (
                  <LeaveRow key={leave.id} leave={leave} showEmployee={showEmployee}
                    showCancel={showCancel} onCancel={onCancel} onView={onView} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ──────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {paginated.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">No leave requests found</p>
        ) : (
          paginated.map((leave) => (
            <LeaveCard key={leave.id} leave={leave} showCancel={showCancel}
              onCancel={onCancel} onView={onView} />
          ))
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {filtered.length === 0 ? '0' : page * pageSize + 1}–
          {Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub components ────────────────────────────────────────────

function SortTh({
  label, k, cur, dir, onSort,
}: { label: string; k: SortKey; cur: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = cur === k
  return (
    <th
      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
      </span>
    </th>
  )
}

function StatusFilterBtn({
  value, current, onClick,
}: { value: LeaveStatus | 'ALL'; current: LeaveStatus | 'ALL'; onClick: (v: LeaveStatus | 'ALL') => void }) {
  const active = value === current
  const cfg = value !== 'ALL' ? LEAVE_STATUS_CONFIG[value] : null
  return (
    <button
      onClick={() => onClick(value)}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        active
          ? cfg ? cfg.badgeClass + ' ring-2 ring-offset-1' : 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground bg-background',
      )}
    >
      {value === 'ALL' ? 'All' : LEAVE_STATUS_CONFIG[value].label}
    </button>
  )
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = LEAVE_STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.badgeClass)}>
      <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', cfg.dotClass)} />
      {cfg.label}
    </span>
  )
}

function LeaveRow({
  leave, showEmployee, showCancel, onCancel, onView,
}: {
  leave: LeaveRequestResponse
  showEmployee: boolean
  showCancel: boolean
  onCancel?: (l: LeaveRequestResponse) => void
  onView?: (l: LeaveRequestResponse) => void
}) {
  return (
    <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors last:border-0">
      {showEmployee && (
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[100px] truncate">
          {leave.userId.slice(0, 8)}…
        </td>
      )}
      <td className="px-4 py-3 font-medium">{leave.leaveTypeName}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtDate(leave.startDate)}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtDate(leave.endDate)}</td>
      <td className="px-4 py-3 tabular-nums font-semibold">{leave.totalDays}</td>
      <td className="px-4 py-3"><StatusBadge status={leave.status} /></td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground text-xs">{fmtDateTime(leave.appliedAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {onView && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(leave)} title="View details">
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {showCancel && leave.status === 'PENDING' && (
            <Button variant="ghost" size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onCancel?.(leave)} title="Cancel request">
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

function LeaveCard({
  leave, showCancel, onCancel, onView,
}: {
  leave: LeaveRequestResponse
  showCancel: boolean
  onCancel?: (l: LeaveRequestResponse) => void
  onView?: (l: LeaveRequestResponse) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{leave.leaveTypeName}</p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(leave.startDate)} – {fmtDate(leave.endDate)}
            <span className="ml-1 font-medium text-foreground">({leave.totalDays}d)</span>
          </p>
        </div>
        <StatusBadge status={leave.status} />
      </div>
      {leave.reason && (
        <p className="text-xs text-muted-foreground line-clamp-2">{leave.reason}</p>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <span className="text-[10px] text-muted-foreground">{fmtDateTime(leave.appliedAt)}</span>
        <div className="flex gap-1">
          {onView && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView(leave)}>
              View
            </Button>
          )}
          {showCancel && leave.status === 'PENDING' && (
            <Button variant="ghost" size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onCancel?.(leave)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
