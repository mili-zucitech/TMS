import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  History,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ArrowLeft,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useUserTimesheets } from '../hooks/useTimesheets'
import { TimesheetStatusBadge } from '../components/TimesheetStatusBadge'
import { formatDisplayDate } from '../utils/timesheetHelpers'

const PAGE_SIZE = 10

export default function TimesheetHistoryPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  // ── Resolve current user UUID from JWT (no network call needed) ───────────
  const userId = authUser?.userId ?? null

  const { timesheets, isLoading, error, fetchTimesheets } = useUserTimesheets(userId)

  // ── Filter / pagination state ──────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!statusFilter) return timesheets
    return timesheets.filter((t) => t.status === statusFilter)
  }, [timesheets, statusFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const selectClass =
    'h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm ' +
    'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
    'focus:ring-offset-1 transition-colors cursor-pointer text-foreground'

  const loading = isLoading

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Back + Header ────────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/timesheets')}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Timesheets
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Timesheet History</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading…' : `${filtered.length} timesheets`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => void fetchTimesheets()}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="LOCKED">Locked</option>
          </select>
          {statusFilter && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('')}
              className="text-muted-foreground">Clear</Button>
          )}
        </div>

        {/* ── Table (desktop) ──────────────────────────────────────── */}
        <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Week Start</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Week End</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Submitted</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No timesheets found.</p>
                  </td>
                </tr>
              ) : (
                paged.map((ts) => (
                  <tr
                    key={ts.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/timesheets/${ts.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{formatDisplayDate(ts.weekStartDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDisplayDate(ts.weekEndDate)}</td>
                    <td className="px-4 py-3">
                      <TimesheetStatusBadge status={ts.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {ts.submittedAt
                        ? new Date(ts.submittedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); navigate(`/timesheets/${ts.id}`) }}
                      >
                        View
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ─────────────────────────────────────────── */}
        <div className="sm:hidden space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))
          ) : paged.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center text-muted-foreground">
              <p className="text-sm">No timesheets found.</p>
            </div>
          ) : (
            paged.map((ts) => (
              <button
                key={ts.id}
                onClick={() => navigate(`/timesheets/${ts.id}`)}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 hover:bg-muted/30 transition-colors text-left group"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatDisplayDate(ts.weekStartDate)} – {formatDisplayDate(ts.weekEndDate)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <TimesheetStatusBadge status={ts.status} />
                    {ts.submittedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(ts.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} · {filtered.length} timesheets
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
