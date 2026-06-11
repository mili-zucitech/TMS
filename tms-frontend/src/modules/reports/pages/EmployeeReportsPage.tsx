import { useMemo, useState } from 'react'
import {
  Clock,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ListChecks,
  RefreshCw,
  TrendingUp,
  FolderKanban,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useGetLeaveBalanceQuery } from '@/features/leave/leaveApi'
import { useGetEmployeeHoursQuery, useGetLeaveReportQuery } from '@/features/reports/reportsApi'
import { useGetTasksByUserQuery } from '@/features/tasks/tasksApi'
import { useGetTimesheetsByUserQuery } from '@/features/timesheets/timesheetsApi'
import { ReportCard } from '../components/ReportCard'
import { ReportTable, type Column } from '../components/ReportTable'
import { ReportBarChart } from '../components/ReportCharts'
import { ExportButtons, type ExportColumn } from '../components/ExportButtons'
import type { EmployeeHoursEntry, LeaveReportEntry } from '../types/report.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(h: number) {
  return h === 0 ? '0h' : `${h.toFixed(1)}h`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Tab ids ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'hours',      label: 'My Hours',      icon: Clock },
  { id: 'projects',   label: 'My Projects',   icon: FolderKanban },
  { id: 'leaves',     label: 'My Leaves',     icon: CalendarDays },
  { id: 'timesheets', label: 'My Timesheets', icon: ClipboardList },
  { id: 'tasks',      label: 'My Tasks',      icon: ListChecks },
] as const
type TabId = (typeof TABS)[number]['id']

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'destructive' | 'secondary'> = {
  APPROVED:     'success',
  SUBMITTED:    'info',
  DRAFT:        'warning',
  NOT_SUBMITTED:'destructive',
  REJECTED:     'destructive',
  PENDING:      'warning',
  CANCELLED:    'secondary',
  LOCKED:       'secondary',
}

const PRIORITY_VARIANT: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  HIGH:   'destructive',
  MEDIUM: 'warning',
  LOW:    'secondary',
}

// ── Export columns ────────────────────────────────────────────────────────────

const hoursExportCols: ExportColumn[] = [
  { key: 'weekStartDate', label: 'Week Start' },
  { key: 'totalHours',    label: 'Total Hours (h)' },
  { key: 'billableHours', label: 'Billable Hours (h)' },
]

const leavesExportCols: ExportColumn[] = [
  { key: 'leaveType',  label: 'Leave Type' },
  { key: 'startDate',  label: 'From' },
  { key: 'endDate',    label: 'To' },
  { key: 'totalDays',  label: 'Days' },
  { key: 'status',     label: 'Status' },
]

const timesheetExportCols: ExportColumn[] = [
  { key: 'weekStartDate', label: 'Week Start' },
  { key: 'weekEndDate',   label: 'Week End' },
  { key: 'status',        label: 'Status' },
  { key: 'submittedAt',   label: 'Submitted' },
  { key: 'approvedAt',    label: 'Approved' },
]

const tasksExportCols: ExportColumn[] = [
  { key: 'title',     label: 'Task' },
  { key: 'status',    label: 'Status' },
  { key: 'priority',  label: 'Priority' },
  { key: 'dueDate',   label: 'Due Date' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeReportsPage() {
  const { user } = useAuth()
  const userId = user?.userId ?? null
  const [activeTab, setActiveTab] = useState<TabId>('hours')

  // Data fetching — report endpoints scope server-side to the authenticated user,
  // so we don't need to pass userId; this also works for sessions where userId
  // was not yet embedded in the JWT.
  const { data: empHoursData, isLoading: hoursLoading, refetch: refetchHours }
    = useGetEmployeeHoursQuery({})

  const { data: leaveReportData, isLoading: leaveLoading }
    = useGetLeaveReportQuery({})

  const { data: leaveBalances = [], isLoading: balanceLoading }
    = useGetLeaveBalanceQuery(userId!, { skip: !userId })

  const { data: timesheets = [], isLoading: tsLoading }
    = useGetTimesheetsByUserQuery(userId!, { skip: !userId })

  const { data: tasks = [], isLoading: tasksLoading }
    = useGetTasksByUserQuery(userId!, { skip: !userId })

  const isLoading = hoursLoading || leaveLoading || balanceLoading || tsLoading || tasksLoading

  // ── Derived: hours per week ────────────────────────────────────────────────

  const myHoursEntries: EmployeeHoursEntry[] = useMemo(() => {
    if (!empHoursData) return []
    return [...empHoursData.entries]
      .filter((e) => !!userId && e.userId === userId)
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
  }, [empHoursData, userId])

  const totalHours = myHoursEntries.reduce((s, e) => s + e.totalHours, 0)
  const totalBillable = myHoursEntries.reduce((s, e) => s + e.billableHours, 0)

  const hoursChart = useMemo(() => {
    return myHoursEntries.slice(0, 12).reverse().map((e) => ({
      name: e.weekStartDate.slice(5),
      value: e.totalHours,
    }))
  }, [myHoursEntries])

  // ── Derived: leaves ───────────────────────────────────────────────────────

  const myLeaves: LeaveReportEntry[] = useMemo(() => {
    if (!leaveReportData) return []
    return [...leaveReportData.entries].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [leaveReportData])

  // ── Derived: timesheets ───────────────────────────────────────────────────

  const sortedTimesheets = useMemo(
    () => [...timesheets].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)),
    [timesheets],
  )

  // ── Derived: tasks ────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate && t.dueDate < today,
  ).length

  // ── Columns ───────────────────────────────────────────────────────────────

  const hoursCols: Column<EmployeeHoursEntry>[] = [
    { key: 'weekStartDate', header: 'Week', sortable: true, render: (v) => formatDate(String(v)) },
    {
      key: 'totalHours', header: 'Total Hours', sortable: true, align: 'right',
      render: (v) => <span className="font-mono font-semibold">{fmtHours(Number(v))}</span>,
    },
    {
      key: 'billableHours', header: 'Billable', sortable: true, align: 'right',
      render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400">{fmtHours(Number(v))}</span>,
    },
    {
      key: 'nonBillableHours', header: 'Non-Billable', align: 'right',
      render: (v) => <span className="font-mono text-muted-foreground">{fmtHours(Number(v))}</span>,
    },
  ]

  const leavesCols: Column<LeaveReportEntry>[] = [
    { key: 'leaveType', header: 'Type', sortable: true },
    { key: 'startDate', header: 'From', sortable: true, render: (v) => formatDate(String(v)) },
    { key: 'endDate',   header: 'To',   render: (v) => formatDate(String(v)) },
    { key: 'totalDays', header: 'Days', align: 'right', sortable: true },
    {
      key: 'status', header: 'Status',
      render: (v) => (
        <Badge variant={STATUS_VARIANT[String(v)] ?? 'secondary'} className="text-[10px]">
          {String(v)}
        </Badge>
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Personal analytics — your hours, leaves, tasks &amp; timesheets</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetchHours()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportCard title="Total Hours Logged" value={fmtHours(totalHours)} icon={Clock}
          subtitle={`${myHoursEntries.length} weeks tracked`} />
        <ReportCard title="Billable Hours" value={fmtHours(totalBillable)} icon={TrendingUp}
          subtitle={totalHours > 0 ? `${Math.round((totalBillable / totalHours) * 100)}% billable` : '—'} />
        <ReportCard title="Total Leave Days" value={String(leaveReportData?.totalDays ?? 0)} icon={CalendarDays}
          subtitle={`${myLeaves.filter((l) => l.status === 'APPROVED').length} approved`} />
        <ReportCard title="Open Tasks" value={String(tasks.filter((t) => t.status !== 'COMPLETED').length)} icon={ListChecks}
          subtitle={overdueTasks > 0 ? `${overdueTasks} overdue` : 'None overdue'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── My Hours ── */}
      {activeTab === 'hours' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Weekly Hours Breakdown</h2>
            <ExportButtons data={myHoursEntries} columns={hoursExportCols} filename="my-hours" reportTitle="My Hours Report" />
          </div>
          {hoursChart.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Hours per week (last {hoursChart.length} weeks)</p>
              <ReportBarChart
                data={hoursChart}
                bars={[{ key: 'value', label: 'Hours' }]}
                height={180}
              />
            </div>
          )}
          <ReportTable columns={hoursCols} data={myHoursEntries} emptyMessage="No hours logged yet" />
        </div>
      )}

      {/* ── My Projects ── */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Hours by Project</h2>
          <p className="text-sm text-muted-foreground">
            Project-level breakdown is generated from your time entries. View detailed breakdown per project in the{' '}
            <strong>Timesheets</strong> module.
          </p>
          <div className="rounded-2xl border bg-card p-6 text-center text-muted-foreground text-sm">
            For a detailed project-hours breakdown, visit the <strong>Timesheets → My Entries</strong> page.
          </div>
        </div>
      )}

      {/* ── My Leaves ── */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Leave History</h2>
            <ExportButtons data={myLeaves} columns={leavesExportCols} filename="my-leaves" reportTitle="My Leave Report" />
          </div>

          {/* Leave balances */}
          {leaveBalances.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {leaveBalances.map((bal) => {
                const pct = bal.totalAllocated > 0
                  ? Math.round(((bal.totalAllocated - bal.remainingLeaves) / bal.totalAllocated) * 100)
                  : 0
                return (
                  <div key={bal.id} className="rounded-xl border bg-card p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground truncate">{bal.leaveTypeName ?? `Type ${bal.leaveTypeId}`}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold">{bal.remainingLeaves}</span>
                      <span className="text-xs text-muted-foreground">/ {bal.totalAllocated} remaining</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{bal.usedLeaves} used · {pct}% consumed</p>
                  </div>
                )
              })}
            </div>
          )}

          <ReportTable columns={leavesCols} data={myLeaves} emptyMessage="No leave history" />
        </div>
      )}

      {/* ── My Timesheets ── */}
      {activeTab === 'timesheets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Timesheet Submission History</h2>
            <ExportButtons
              data={sortedTimesheets.map((ts) => ({
                weekStartDate: ts.weekStartDate,
                weekEndDate: ts.weekEndDate,
                status: ts.status,
                submittedAt: ts.submittedAt ?? '—',
                approvedAt: ts.approvedAt ?? '—',
                rejectionReason: ts.rejectionReason ?? '',
              }))}
              columns={timesheetExportCols}
              filename="my-timesheets"
              reportTitle="My Timesheet History"
            />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', count: sortedTimesheets.length, icon: ClipboardList, color: 'text-blue-600 bg-blue-500/10' },
              { label: 'Approved', count: sortedTimesheets.filter((t) => t.status === 'APPROVED').length, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: 'Submitted', count: sortedTimesheets.filter((t) => t.status === 'SUBMITTED').length, icon: TrendingUp, color: 'text-blue-600 bg-blue-500/10' },
              { label: 'Draft', count: sortedTimesheets.filter((t) => t.status === 'DRAFT').length, icon: AlertCircle, color: 'text-amber-600 bg-amber-500/10' },
            ].map(({ label, count, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {['Week', 'Status', 'Submitted', 'Approved', 'Note'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-muted" /></td>
                      ))}
                    </tr>
                  ))
                ) : sortedTimesheets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No timesheets found</td>
                  </tr>
                ) : sortedTimesheets.map((ts) => (
                  <tr key={ts.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{ts.weekStartDate}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[ts.status] ?? 'secondary'} className="text-[10px]">{ts.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{ts.submittedAt ? formatDate(ts.submittedAt) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{ts.approvedAt ? formatDate(ts.approvedAt) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {ts.rejectionReason
                        ? <span className="text-rose-500">{ts.rejectionReason}</span>
                        : ts.overtimeReason
                          ? <span className="text-amber-600">{ts.overtimeReason}</span>
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── My Tasks ── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Assigned Tasks</h2>
            <ExportButtons
              data={tasks.map((t) => ({
                title: t.title,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate ?? '—',
              }))}
              columns={tasksExportCols}
              filename="my-tasks"
              reportTitle="My Tasks"
            />
          </div>

          {/* Task summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',       count: tasks.length,                                                 color: 'bg-blue-500/10 text-blue-600' },
              { label: 'Completed',   count: tasks.filter((t) => t.status === 'COMPLETED').length,          color: 'bg-emerald-500/10 text-emerald-600' },
              { label: 'In Progress', count: tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length, color: 'bg-amber-500/10 text-amber-600' },
              { label: 'Overdue',     count: overdueTasks,                                                  color: 'bg-rose-500/10 text-rose-600' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-xl border bg-card p-3`}>
                <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {['Task', 'Status', 'Priority', 'Due Date'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasksLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-muted" /></td>
                      ))}
                    </tr>
                  ))
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No tasks assigned</td>
                  </tr>
                ) : tasks.map((t) => {
                  const isOverdue = t.status !== 'COMPLETED' && t.dueDate && t.dueDate < today
                  return (
                    <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isOverdue && <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                          <div>
                            <p className="font-medium text-sm">{t.title}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{t.taskCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'} className="text-[10px]">
                          {t.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={PRIORITY_VARIANT[t.priority] ?? 'secondary'} className="text-[10px]">
                          {t.priority}
                        </Badge>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-rose-500 font-medium' : 'text-muted-foreground'}`}>
                        {t.dueDate ? formatDate(t.dueDate) : '—'}
                        {isOverdue && ' ⚠'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
