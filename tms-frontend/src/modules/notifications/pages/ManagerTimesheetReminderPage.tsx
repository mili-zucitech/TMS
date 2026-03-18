import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Mail,
  Search,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  SendHorizonal,
  RefreshCw,
  Info,
  ChevronDown,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { getAllUsers, getTimesheetsForUser } from '../services/managerTimesheetService'
import { sendTimesheetReminder } from '../services/notificationService'
import type {
  EmployeeTimesheetStatus,
  TimesheetResponse,
  UserResponse,
} from '../types/notification.types'

// ── Role guard ────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'HR'] as const

// ── Week helpers ──────────────────────────────────────────────────────────────

/** Returns the ISO date ("YYYY-MM-DD") of the Monday of the current week. */
function getWeekStartDate(): string {
  const now = new Date()
  const dow = now.getDay() // 0 = Sunday
  const daysBack = dow === 0 ? 6 : dow - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysBack)
  return monday.toISOString().split('T')[0]
}

function isFridayMorning(): boolean {
  const now = new Date()
  return now.getDay() === 5 && now.getHours() < 12
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function deriveStatus(timesheet: TimesheetResponse | null): EmployeeTimesheetStatus {
  if (!timesheet) return 'NOT_SUBMITTED'
  return timesheet.status as EmployeeTimesheetStatus
}

interface StatusConfig {
  label: string
  variant: 'destructive' | 'warning' | 'info' | 'success' | 'secondary' | 'default' | 'outline'
  needsReminder: boolean
}

const STATUS_CONFIG: Record<EmployeeTimesheetStatus, StatusConfig> = {
  NOT_SUBMITTED: { label: 'Not Submitted', variant: 'destructive', needsReminder: true },
  DRAFT: { label: 'Draft / Partial', variant: 'warning', needsReminder: true },
  SUBMITTED: { label: 'Submitted', variant: 'info', needsReminder: false },
  APPROVED: { label: 'Approved', variant: 'success', needsReminder: false },
  REJECTED: { label: 'Rejected', variant: 'destructive', needsReminder: true },
  LOCKED: { label: 'Locked', variant: 'secondary', needsReminder: false },
}

// ── Row type ──────────────────────────────────────────────────────────────────

interface EmployeeRow {
  user: UserResponse
  timesheet: TimesheetResponse | null
  derivedStatus: EmployeeTimesheetStatus
}

// ── Status filter type ────────────────────────────────────────────────────────
type StatusFilter = 'ALL' | EmployeeTimesheetStatus

// ── Friday banner ─────────────────────────────────────────────────────────────

function FridayBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
      <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Friday Reminder Emails Sent
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400/80">
          Automated reminder emails have been sent to all employees to submit their timesheets for
          this week.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
        aria-label="Dismiss"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Stats card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  color: string
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ── Mobile card ───────────────────────────────────────────────────────────────

interface MobileEmployeeCardProps {
  row: EmployeeRow
  isSending: boolean
  onSend: (userId: string) => void
}

function MobileEmployeeCard({ row, isSending, onSend }: MobileEmployeeCardProps) {
  const { user, timesheet, derivedStatus } = row
  const config = STATUS_CONFIG[derivedStatus]
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground/70">Designation</p>
          <p>{user.designation ?? '—'}</p>
        </div>
        <div>
          <p className="font-medium text-foreground/70">Last Updated</p>
          <p>{formatDate(timesheet?.updatedAt)}</p>
        </div>
      </div>
      {config.needsReminder && (
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          loading={isSending}
          disabled={isSending}
          onClick={() => onSend(user.id)}
        >
          <Mail className="h-3.5 w-3.5" />
          Send Reminder
        </Button>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerTimesheetReminderPage() {
  const { user: authUser } = useAuth()

  // Role guard
  if (!authUser || !ALLOWED_ROLES.includes(authUser.roleName as (typeof ALLOWED_ROLES)[number])) {
    return <Navigate to="/dashboard" replace />
  }

  return <ManagerTimesheetReminderContent managerId={authUser.userId!} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Separate inner component so hooks run after the role guard
// ─────────────────────────────────────────────────────────────────────────────

function ManagerTimesheetReminderContent({ managerId }: { managerId: string }) {
  const isFriday = isFridayMorning()
  const weekStart = useMemo(() => getWeekStartDate(), [])

  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-employee reminder loading state: Set<userId>
  const [sendingSet, setSendingSet] = useState<Set<string>>(new Set())

  // Bulk confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isBulkSending, setIsBulkSending] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const allUsers = await getAllUsers()
      const { user: authUser } = { user: { userId: managerId } }

      // Filter to direct reports (users whose managerId = this manager's UUID)
      const reports = allUsers.filter((u) => u.managerId === authUser.userId)

      if (reports.length === 0) {
        setRows([])
        setIsLoading(false)
        return
      }

      // Fetch timesheets for each report in parallel
      const timesheetResults = await Promise.allSettled(
        reports.map((u) => getTimesheetsForUser(u.id)),
      )

      const newRows: EmployeeRow[] = reports.map((user, idx) => {
        const result = timesheetResults[idx]
        let timesheet: TimesheetResponse | null = null
        if (result.status === 'fulfilled') {
          // Find the timesheet matching the current week start date
          timesheet =
            result.value.find((ts) => ts.weekStartDate === weekStart) ?? null
        }
        return { user, timesheet, derivedStatus: deriveStatus(timesheet) }
      })

      // Sort: pending first, then alphabetically
      newRows.sort((a, b) => {
        const aNeedsReminder = STATUS_CONFIG[a.derivedStatus].needsReminder ? 0 : 1
        const bNeedsReminder = STATUS_CONFIG[b.derivedStatus].needsReminder ? 0 : 1
        if (aNeedsReminder !== bNeedsReminder) return aNeedsReminder - bNeedsReminder
        return a.user.name.localeCompare(b.user.name)
      })

      setRows(newRows)
    } catch {
      setError('Failed to load team data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [managerId, weekStart])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ── Filtered rows ────────────────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        search === '' ||
        row.user.name.toLowerCase().includes(search.toLowerCase()) ||
        row.user.email.toLowerCase().includes(search.toLowerCase()) ||
        (row.user.designation ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus =
        statusFilter === 'ALL' || row.derivedStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const pending = rows.filter((r) => STATUS_CONFIG[r.derivedStatus].needsReminder).length
    const submitted = rows.filter((r) => r.derivedStatus === 'SUBMITTED').length
    const approved = rows.filter((r) => r.derivedStatus === 'APPROVED').length
    return { total: rows.length, pending, submitted, approved }
  }, [rows])

  const pendingRows = useMemo(
    () => filteredRows.filter((r) => STATUS_CONFIG[r.derivedStatus].needsReminder),
    [filteredRows],
  )

  // ── Single reminder ───────────────────────────────────────────────────────────

  const handleSendReminder = async (userId: string) => {
    setSendingSet((prev) => new Set(prev).add(userId))
    try {
      await sendTimesheetReminder(userId)
      toast.success('Reminder sent successfully')
    } catch {
      toast.error('Failed to send reminder')
    } finally {
      setSendingSet((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  // ── Bulk reminder ─────────────────────────────────────────────────────────────

  const handleBulkSend = async () => {
    setIsBulkSending(true)
    const targets = rows.filter((r) => STATUS_CONFIG[r.derivedStatus].needsReminder)
    let successCount = 0
    let failCount = 0
    await Promise.allSettled(
      targets.map(async (r) => {
        try {
          await sendTimesheetReminder(r.user.id)
          successCount++
        } catch {
          failCount++
        }
      }),
    )
    setIsBulkSending(false)
    setConfirmOpen(false)
    if (successCount > 0) toast.success(`Reminders sent to ${successCount} employee(s)`)
    if (failCount > 0) toast.error(`Failed to send ${failCount} reminder(s)`)
  }

  // ── Responsive hook ───────────────────────────────────────────────────────────

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-screen-xl mx-auto">
      {/* Friday banner */}
      {isFriday && <FridayBanner />}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Send Reminders</h1>
            <p className="text-sm text-muted-foreground">
              Week of {formatDate(weekStart)} — manage timesheet submissions for your team
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          {stats.pending > 0 && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setConfirmOpen(true)}
              disabled={isLoading || isBulkSending}
            >
              <SendHorizonal className="h-3.5 w-3.5" />
              Send Reminder to All Pending ({stats.pending})
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Team"
            value={stats.total}
            icon={Users}
            color="text-blue-600 dark:text-blue-400 bg-blue-500/10"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={AlertCircle}
            color="text-red-600 dark:text-red-400 bg-red-500/10"
          />
          <StatCard
            label="Submitted"
            value={stats.submitted}
            icon={Clock}
            color="text-amber-600 dark:text-amber-400 bg-amber-500/10"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle}
            color="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => void loadData()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filter row */}
      {!isLoading && !error && rows.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name, email, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'transition-all duration-200',
              )}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={cn(
                'h-9 w-full sm:w-48 appearance-none rounded-lg border border-input bg-background',
                'px-3 pr-8 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'transition-all duration-200',
              )}
            >
              <option value="ALL">All Statuses</option>
              {(Object.keys(STATUS_CONFIG) as EmployeeTimesheetStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty team state */}
      {!isLoading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium text-muted-foreground">No direct reports found</p>
          <p className="text-sm text-muted-foreground/70">
            No users are assigned to you as their reporting manager.
          </p>
        </div>
      )}

      {/* ── Desktop table ── */}
      {!isLoading && !error && filteredRows.length > 0 && !isMobile && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Designation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Submitted At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRows.map((row) => {
                  const config = STATUS_CONFIG[row.derivedStatus]
                  const isSending = sendingSet.has(row.user.id)
                  return (
                    <tr
                      key={row.user.id}
                      className={cn(
                        'transition-colors',
                        config.needsReminder ? 'bg-destructive/[0.03]' : 'hover:bg-muted/30',
                      )}
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                            {row.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{row.user.name}</p>
                            <p className="text-xs text-muted-foreground">{row.user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.user.designation ?? '—'}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>

                      {/* Submitted at */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(row.timesheet?.submittedAt)}
                      </td>

                      {/* Last updated */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(row.timesheet?.updatedAt)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {config.needsReminder && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8 text-xs"
                            loading={isSending}
                            disabled={isSending}
                            onClick={() => void handleSendReminder(row.user.id)}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Send Reminder
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* No results found from filter */}
          {filteredRows.length === 0 && rows.length > 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No employees match the current filter.
            </div>
          )}
        </div>
      )}

      {/* ── Mobile cards ── */}
      {!isLoading && !error && filteredRows.length > 0 && isMobile && (
        <div className="space-y-3">
          {filteredRows.map((row) => (
            <MobileEmployeeCard
              key={row.user.id}
              row={row}
              isSending={sendingSet.has(row.user.id)}
              onSend={(userId) => void handleSendReminder(userId)}
            />
          ))}
        </div>
      )}

      {/* No filter results */}
      {!isLoading && !error && rows.length > 0 && filteredRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No employees match the current filters.</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('ALL') }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Bulk confirm dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reminder Emails</DialogTitle>
            <DialogDescription>
              This will send reminder emails to{' '}
              <strong>{pendingRows.length} employee(s)</strong> who have not yet submitted their
              timesheets for the current week. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isBulkSending}
            >
              Cancel
            </Button>
            <Button
              loading={isBulkSending}
              disabled={isBulkSending}
              onClick={() => void handleBulkSend()}
              className="gap-2"
            >
              <SendHorizonal className="h-4 w-4" />
              Send Reminders
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
