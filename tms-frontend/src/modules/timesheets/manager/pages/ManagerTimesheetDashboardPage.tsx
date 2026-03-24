import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  RefreshCw,
  Search,
  AlertCircle,
  Eye,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TimesheetStatusBadge } from '../../components/TimesheetStatusBadge'
import { useManagerDashboard } from '../hooks/useManagerTimesheets'
import {
  formatMediumDate,
} from '../../utils/timesheetHelpers'
import { StatCard } from '@/components/ui/StatCard'
import type { ManagerTimesheetRow } from '../types/managerTimesheet.types'

const selectClass =
  'flex h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors'

// ────────────────────────────────────────────────────────────────────────────
// Mobile card for small screens
// ────────────────────────────────────────────────────────────────────────────
function MobileTimesheetCard({
  row,
  onReview,
}: {
  row: ManagerTimesheetRow
  onReview: (id: number) => void
}) {
  const { timesheet, employee } = row
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm">{employee.name}</p>
          <p className="text-xs text-muted-foreground">{employee.employeeId}</p>
        </div>
        <TimesheetStatusBadge status={timesheet.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Week Start</span>
          <p className="font-medium">{formatMediumDate(timesheet.weekStartDate)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Week End</span>
          <p className="font-medium">{formatMediumDate(timesheet.weekEndDate)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Submitted</span>
          <p className="font-medium">
            {timesheet.submittedAt
              ? formatMediumDate(timesheet.submittedAt.split('T')[0])
              : '—'}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-1.5"
        onClick={() => onReview(timesheet.id)}
      >
        <Eye className="h-3.5 w-3.5" />
        Review
      </Button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────
export default function ManagerTimesheetDashboardPage() {
  const navigate = useNavigate()
  const { rows, isLoading, error, reload } = useManagerDashboard()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const matchName =
        !q ||
        r.employee.name.toLowerCase().includes(q) ||
        r.employee.employeeId.toLowerCase().includes(q)
      const matchStatus = !statusFilter || r.timesheet.status === statusFilter
      return matchName && matchStatus
    })
  }, [rows, search, statusFilter])

  const pendingCount  = rows.filter((r) => r.timesheet.status === 'SUBMITTED').length
  const approvedCount = rows.filter((r) => r.timesheet.status === 'APPROVED').length
  const rejectedCount = rows.filter((r) => r.timesheet.status === 'REJECTED').length

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Team Timesheets</h1>
              <p className="text-sm text-muted-foreground">
                Review and approve your team's submitted timesheets
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => void reload()}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}         label="Team Members"  value={new Set(rows.map((r) => r.employee.id)).size} />
          <StatCard icon={ClipboardCheck} label="Pending Review" value={pendingCount} />
          <StatCard icon={CheckCircle2}   label="Approved"      value={approvedCount} />
          <StatCard icon={XCircle}        label="Rejected"      value={rejectedCount} />
        </div>

        {/* ── Error banner ───────────────────────────────────────── */}
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
              onClick={() => void reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or ID…"
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* ── Desktop table ──────────────────────────────────────── */}
        <div className="hidden sm:block rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Week</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Submitted</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {rows.length === 0
                      ? 'No timesheets found for your team.'
                      : 'No results match your search / filter.'}
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((row) => (
                  <tr
                    key={row.timesheet.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                          {row.employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{row.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{row.employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {formatMediumDate(row.timesheet.weekStartDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        → {formatMediumDate(row.timesheet.weekEndDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {row.timesheet.submittedAt
                        ? formatMediumDate(row.timesheet.submittedAt.split('T')[0])
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TimesheetStatusBadge status={row.timesheet.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        className="h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-1.5"
                        onClick={() =>
                          navigate(`/timesheets/manager/review/${row.timesheet.id}`)
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {!isLoading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border/50 bg-muted/10 text-xs text-muted-foreground">
              Showing {filtered.length} of {rows.length} timesheets
            </div>
          )}
        </div>

        {/* ── Mobile cards ───────────────────────────────────────── */}
        <div className="sm:hidden space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
            ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              {rows.length === 0
                ? 'No timesheets found for your team.'
                : 'No results match your search / filter.'}
            </p>
          )}
          {!isLoading &&
            filtered.map((row) => (
              <MobileTimesheetCard
                key={row.timesheet.id}
                row={row}
                onReview={(id) => navigate(`/timesheets/manager/review/${id}`)}
              />
            ))}
        </div>

      </div>
    </div>
  )
}
