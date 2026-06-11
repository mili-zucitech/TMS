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
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useGetFilteredTimesheetsByUserQuery } from '@/features/timesheets/timesheetsApi'
import { TimesheetStatusBadge } from '../components/TimesheetStatusBadge'
import { TimesheetFilters } from '../components/TimesheetFilters'
import { AppSelect } from '@/components/ui/Select'
import { formatDisplayDate } from '../utils/timesheetHelpers'
import type { TimesheetFilterParams, TimesheetStatus } from '../types/timesheet.types'

const PAGE_SIZE = 10

function getDefaultFilters(): { year: number } & TimesheetFilterParams {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'LOCKED', label: 'Locked' },
]

const STATUS_LEFT_BORDER: Record<TimesheetStatus, string> = {
  DRAFT:     'border-l-slate-400',
  SUBMITTED: 'border-l-blue-500',
  APPROVED:  'border-l-emerald-500',
  REJECTED:  'border-l-red-500',
  LOCKED:    'border-l-violet-500',
}

export default function TimesheetHistoryPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const userId = authUser?.userId ?? null

  const [filters, setFilters] = useState<{ year: number } & TimesheetFilterParams>(
    getDefaultFilters,
  )

  const { data: rawTimesheets = [], isLoading, error: queryError, refetch } =
    useGetFilteredTimesheetsByUserQuery(
      { userId: userId!, ...filters },
      { skip: !userId },
    )

  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const sorted = [...rawTimesheets].sort(
      (a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime(),
    )
    if (!statusFilter) return sorted
    return sorted.filter((t) => t.status === statusFilter)
  }, [rawTimesheets, statusFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const error = queryError
    ? ((queryError as { data?: { message?: string } })?.data?.message ?? 'Failed to load timesheets')
    : null

  // Stats derived from unfiltered (by status) raw data
  const stats = useMemo(() => ({
    total:     rawTimesheets.length,
    approved:  rawTimesheets.filter((t) => t.status === 'APPROVED').length,
    pending:   rawTimesheets.filter((t) => t.status === 'SUBMITTED').length,
    rejected:  rawTimesheets.filter((t) => t.status === 'REJECTED').length,
  }), [rawTimesheets])

  function handleFiltersChange(next: { year: number } & TimesheetFilterParams) {
    setFilters(next)
    setPage(0)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Back nav ─────────────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/timesheets')}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Timesheets
        </Button>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Timesheet History</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isLoading
                  ? 'Loading your timesheets…'
                  : `${filtered.length} timesheet${filtered.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Stats strip ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{isLoading ? '—' : stats.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-emerald-700 dark:text-emerald-400">
                {isLoading ? '—' : stats.approved}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Approved</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-blue-700 dark:text-blue-400">
                {isLoading ? '—' : stats.pending}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 shrink-0">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-red-700 dark:text-red-400">
                {isLoading ? '—' : stats.rejected}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Rejected</p>
            </div>
          </div>
        </div>

        {/* ── Filter panel ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TimesheetFilters filters={filters} onChange={handleFiltersChange} />
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div className="w-40">
              <AppSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(String(v)); setPage(0) }}
                options={STATUS_OPTIONS}
                placeholder="All Statuses"
                isSearchable={false}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* ── Desktop table ────────────────────────────────────────── */}
        <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide whitespace-nowrap">Week</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide whitespace-nowrap">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide whitespace-nowrap">Submitted</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wide whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-44 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="h-5 w-20 animate-pulse rounded-full bg-muted" /></td>
                    <td className="px-5 py-4"><div className="h-3.5 w-24 animate-pulse rounded bg-muted" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-7 w-14 animate-pulse rounded-lg bg-muted ml-auto" /></td>
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
                        <CalendarDays className="h-6 w-6 opacity-50" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground/70">No timesheets found</p>
                        <p className="text-xs mt-1">Try adjusting your filters to see results.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((ts) => (
                  <tr
                    key={ts.id}
                    onClick={() => navigate(`/timesheets/${ts.id}`)}
                    className={`border-l-[3px] ${STATUS_LEFT_BORDER[ts.status]} hover:bg-muted/30 transition-colors cursor-pointer group`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 shrink-0">
                          <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-[13px]">
                            {formatDisplayDate(ts.weekStartDate)} – {formatDisplayDate(ts.weekEndDate)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Week of {new Date(ts.weekStartDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <TimesheetStatusBadge status={ts.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {ts.submittedAt
                        ? new Date(ts.submittedAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : <span className="text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/timesheets/${ts.id}`) }}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium
                          text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20
                          hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                      >
                        View
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* ── Mobile cards ─────────────────────────────────────────── */}
        <div className="sm:hidden space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
              </div>
            ))
          ) : paged.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">No timesheets found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            paged.map((ts) => (
              <button
                key={ts.id}
                onClick={() => navigate(`/timesheets/${ts.id}`)}
                className={`w-full text-left rounded-xl border border-border bg-card border-l-[3px]
                  ${STATUS_LEFT_BORDER[ts.status]}
                  px-4 py-4 hover:bg-muted/30 transition-colors group`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {formatDisplayDate(ts.weekStartDate)} – {formatDisplayDate(ts.weekEndDate)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(ts.weekStartDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <TimesheetStatusBadge status={ts.status} />
                      {ts.submittedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(ts.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page + 1}</span> of {totalPages}
              <span className="text-muted-foreground/60 ml-1">· {filtered.length} total</span>
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
              {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                <Button
                  key={i}
                  variant={i === page ? 'default' : 'outline'}
                  size="icon"
                  className={`h-8 w-8 text-xs ${i === page
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white hover:from-emerald-600 hover:to-teal-700'
                    : ''}`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
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
