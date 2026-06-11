import { useMemo, useState } from 'react'
import {
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  CalendarOff,
  UserCheck,
  Award,
  BarChart2,
  FolderKanban,
  Zap,
  CheckCircle2,
  ListChecks,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, statusBadge, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportLineChart, ReportPieChart } from '../components/ReportCharts'
import { TrendInsights } from '../components/TrendInsights'
import { ExportButtons, type ExportColumn, type ExportSection, type ExportChartData } from '../components/ExportButtons'
import { useManagerReports } from '../hooks/useReports'
import type {
  EmployeeHoursEntry,
  LeaveReportEntry,
  ProjectUtilizationEntry,
  TimesheetComplianceEntry,
  TaskSummaryEntry,
  OvertimeSummaryEntry,
} from '../types/report.types'

// ── Export column definitions ────────────────────────────────────────────────
const teamHoursExportCols: ExportColumn[] = [
  { key: 'employeeName',  label: 'Team Member' },
  { key: 'department',    label: 'Department' },
  { key: 'weekStartDate', label: 'Week Start Date' },
  { key: 'totalHours',    label: 'Total Hours (h)' },
]

const leaveExportCols: ExportColumn[] = [
  { key: 'employeeName', label: 'Team Member' },
  { key: 'department',   label: 'Department' },
  { key: 'leaveType',    label: 'Leave Type' },
  { key: 'startDate',    label: 'Start Date' },
  { key: 'endDate',      label: 'End Date' },
  { key: 'totalDays',    label: 'Total Days' },
  { key: 'status',       label: 'Status' },
]
const projectHoursExportCols: ExportColumn[] = [
  { key: 'projectName',        label: 'Project' },
  { key: 'activeEmployees',    label: 'Active Employees' },
  { key: 'loggedHours',        label: 'Logged Hours (h)' },
  { key: 'allocatedHours',     label: 'Allocated Hours (h)' },
  { key: 'utilizationPercent', label: 'Utilization %' },
]

const overtimeExportCols: ExportColumn[] = [
  { key: 'employeeName',   label: 'Team Member' },
  { key: 'department',     label: 'Department' },
  { key: 'weekStartDate',  label: 'Week' },
  { key: 'totalHours',     label: 'Total Hours (h)' },
  { key: 'overtimeHours',  label: 'Overtime Hours (h)' },
  { key: 'overtimeReason', label: 'Reason' },
]

const complianceExportCols: ExportColumn[] = [
  { key: 'employeeName',     label: 'Team Member' },
  { key: 'department',       label: 'Department' },
  { key: 'totalTimesheets',  label: 'Total Timesheets' },
  { key: 'submitted',        label: 'Submitted' },
  { key: 'approved',         label: 'Approved' },
  { key: 'rejected',         label: 'Rejected' },
  { key: 'draft',            label: 'Draft' },
  { key: 'compliancePercent',label: 'Compliance %' },
]

const taskSummaryExportCols: ExportColumn[] = [
  { key: 'projectName',    label: 'Project' },
  { key: 'totalTasks',     label: 'Total Tasks' },
  { key: 'completedTasks', label: 'Completed' },
  { key: 'inProgressTasks',label: 'In Progress' },
  { key: 'blockedTasks',   label: 'Blocked' },
  { key: 'todoTasks',      label: 'To Do' },
  { key: 'completionRate', label: 'Completion %' },
  { key: 'estimatedHours', label: 'Estimated Hours (h)' },
  { key: 'loggedHours',    label: 'Logged Hours (h)' },
  { key: 'variance',       label: 'Variance (h)' },
]
// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'team-hours',  label: 'Team Hours' },
  { id: 'leave',       label: 'Leave' },
  { id: 'projects',    label: 'Project Hours' },
  { id: 'compliance',  label: 'Overtime & Compliance' },
  { id: 'tasks',       label: 'Team Tasks' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Team work hours columns ───────────────────────────────────────────────────
const teamHoursCols: Column<EmployeeHoursEntry>[] = [
  { key: 'employeeName', header: 'Team Member', sortable: true },
  { key: 'department',   header: 'Department',  sortable: true },
  { key: 'weekStartDate',header: 'Week Of',     sortable: true },
  { key: 'totalHours',   header: 'Total Hours', sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
]

// ── Leave columns ─────────────────────────────────────────────────────────────
const leaveCols: Column<LeaveReportEntry>[] = [
  { key: 'employeeName', header: 'Team Member', sortable: true },
  { key: 'leaveType',    header: 'Leave Type',  sortable: true },
  { key: 'totalDays',    header: 'Days',        sortable: true, align: 'right' },
  { key: 'startDate',    header: 'From',        sortable: true },
  { key: 'endDate',      header: 'To',          sortable: true },
  { key: 'status',       header: 'Status',      sortable: true,
    render: (v) => statusBadge(String(v)) },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { hours, leave, projects, overtime, compliance, tasks, isLoading, error, applyFilters, refresh } = useManagerReports()

  // ── Chart data ────────────────────────────────────────────────────────────
  const hoursPerMemberBar = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      map.set(e.employeeName, (map.get(e.employeeName) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const weeklyTrendLine = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      const week = e.weekStartDate ?? 'Unknown'
      map.set(week, (map.get(week) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const teamDistPie = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      map.set(e.employeeName, (map.get(e.employeeName) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const leaveDistBar = useMemo(() => {
    if (!leave.data) return []
    const map = new Map<string, number>()
    for (const e of leave.data.entries) {
      map.set(e.leaveType, (map.get(e.leaveType) ?? 0) + e.totalDays)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [leave.data])

  const leaveStatusPie = useMemo(() => {
    if (!leave.data) return []
    return [
      { name: 'Approved', value: leave.data.totalApproved ?? 0 },
      { name: 'Pending',  value: leave.data.totalPending  ?? 0 },
      { name: 'Rejected', value: leave.data.totalRejected ?? 0 },
    ].filter((d) => d.value > 0)
  }, [leave.data])

  const avgHoursPerMember = useMemo(() => {
    if (!hours.data || hours.data.employeeCount === 0) return 0
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      map.set(e.employeeName, (map.get(e.employeeName) ?? 0) + e.totalHours)
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0)
    return total / map.size
  }, [hours.data])

  const allSections = useMemo<ExportSection[]>(() => [
    {
      title: 'Team Hours', data: hours.data?.entries ?? [], columns: teamHoursExportCols,
      charts: [
        { title: 'Hours per Team Member', type: 'bar' as const, data: hoursPerMemberBar, valueLabel: 'Hours (h)' },
        { title: 'Weekly Hours Trend',    type: 'line' as const, data: weeklyTrendLine,  valueLabel: 'Total Hours' },
      ],
    },
    {
      title: 'Leave', data: leave.data?.entries ?? [], columns: leaveExportCols,
      charts: [
        { title: 'Leave Days by Type',        type: 'bar' as const, data: leaveDistBar,    valueLabel: 'Days' },
        { title: 'Leave Status Distribution', type: 'pie' as const, data: leaveStatusPie },
      ],
    },
    {
      title: 'Project Hours', data: projects.data?.entries ?? [], columns: projectHoursExportCols,
      charts: [
        { title: 'Project Utilization %', type: 'bar' as const, data: (projects.data?.entries ?? []).map((e) => ({ name: e.projectName, value: e.utilizationPercent ?? 0 })), valueLabel: 'Utilization %' },
        { title: 'Logged Hours by Project', type: 'bar' as const, data: (projects.data?.entries ?? []).map((e) => ({ name: e.projectName, value: e.loggedHours })), valueLabel: 'Hours (h)' },
      ],
    },
    {
      title: 'Overtime', data: overtime.data?.entries ?? [], columns: overtimeExportCols,
      charts: [
        { title: 'Overtime Hours per Member', type: 'bar' as const, data: (overtime.data?.entries ?? []).map((e) => ({ name: e.employeeName, value: e.overtimeHours })), valueLabel: 'Overtime Hours (h)' } as ExportChartData,
      ],
    },
    {
      title: 'Timesheet Compliance', data: compliance.data?.entries ?? [], columns: complianceExportCols,
      charts: [
        { title: 'Compliance % per Member', type: 'bar' as const, data: (compliance.data?.entries ?? []).map((e) => ({ name: e.employeeName, value: e.compliancePercent })), valueLabel: 'Compliance %' } as ExportChartData,
      ],
    },
    {
      title: 'Team Tasks', data: tasks.data?.entries ?? [], columns: taskSummaryExportCols,
      charts: [
        { title: 'Task Completion Rate', type: 'bar' as const, data: (tasks.data?.entries ?? []).map((e) => ({ name: e.projectName, value: e.completionRate ?? 0 })), valueLabel: 'Completion %' } as ExportChartData,
      ],
    },
  ], [hours.data, leave.data, projects.data, overtime.data, compliance.data, tasks.data,
      hoursPerMemberBar, weeklyTrendLine, leaveDistBar, leaveStatusPie])

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manager Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Team-level productivity, hours, and leave tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButtons sections={allSections} filename="manager-full-report" reportTitle="Manager Full Report" />
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <ReportFilters filters={{}} onApply={applyFilters} showEmployee showProject />

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReportCard
          title="Team Members"
          value={hours.data?.employeeCount ?? '—'}
          icon={Users}
          iconColor="from-blue-500 to-blue-600"
        />
        <ReportCard
          title="Total Team Hours"
          value={hours.data ? `${hours.data.totalHours.toFixed(0)}h` : '—'}
          icon={Clock}
          iconColor="from-emerald-500 to-teal-600"
        />
        <ReportCard
          title="Avg hrs / Member"
          value={avgHoursPerMember ? `${avgHoursPerMember.toFixed(1)}h` : '—'}
          icon={Award}
          iconColor="from-violet-500 to-purple-600"
        />
        <ReportCard
          title="Leave Days Taken"
          value={leave.data?.totalDays ?? '—'}
          icon={CalendarOff}
          iconColor="from-amber-500 to-orange-500"
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'overview' && (
        <div className="space-y-4">
          <TrendInsights
            hours={hours.data}
            leave={leave.data}
            title="Team Trend Insights"
          />
          <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Hours per Team Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={hoursPerMemberBar}
                bars={[{ key: 'value', label: 'Total Hours', color: '#3b82f6' }]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Weekly Hours Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportLineChart
                data={weeklyTrendLine}
                lines={[{ key: 'value', label: 'Team Hours', color: '#6366f1' }]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-emerald-500" />
                Hours Share by Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart data={teamDistPie} innerRadius={45} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-amber-500" />
                Leave by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={leaveDistBar}
                bars={[{ key: 'value', label: 'Days', color: '#f59e0b' }]}
              />
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* ── Team Hours tab ─────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'team-hours' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Hours Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={hoursPerMemberBar}
                bars={[{ key: 'value', label: 'Total Hours', color: '#3b82f6' }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Team Work Hours Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={hours.data?.entries ?? []}
                columns={teamHoursCols}
                searchable
                searchKeys={['employeeName']}
                emptyMessage="No team hours data for the selected period"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Leave tab ─────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReportCard
              title="Approved"
              value={leave.data?.totalApproved ?? '—'}
              icon={UserCheck}
              iconColor="from-emerald-500 to-teal-600"
            />
            <ReportCard
              title="Pending"
              value={leave.data?.totalPending ?? '—'}
              icon={Clock}
              iconColor="from-amber-500 to-orange-500"
            />
            <ReportCard
              title="Rejected"
              value={leave.data?.totalRejected ?? '—'}
              icon={CalendarOff}
              iconColor="from-red-500 to-rose-600"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarOff className="h-4 w-4 text-amber-500" />
                  Leave by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportBarChart
                  data={leaveDistBar}
                  bars={[{ key: 'value', label: 'Days', color: '#f59e0b' }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-rose-500" />
                  Leave Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportPieChart data={leaveStatusPie} innerRadius={45} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-amber-500" />
                Leave Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={leave.data?.entries ?? []}
                columns={leaveCols}
                searchable
                searchKeys={['employeeName', 'leaveType']}
                emptyMessage="No leave data for the selected period"
              />
            </CardContent>
          </Card>
        </div>
      )}
      {/* ── Project Hours tab ──────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'projects' && (
        <div className="space-y-4">

          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportCard
              title="Active Projects"
              value={projects.data?.entries.length ?? '—'}
              icon={FolderKanban}
              iconColor="from-blue-500 to-indigo-600"
            />
            <ReportCard
              title="Total Logged Hours"
              value={projects.data ? `${projects.data.entries.reduce((s, e) => s + e.loggedHours, 0).toFixed(0)}h` : '—'}
              icon={Clock}
              iconColor="from-emerald-500 to-teal-600"
            />
            <ReportCard
              title="Total Allocated Hours"
              value={projects.data ? `${projects.data.entries.reduce((s, e) => s + (e.allocatedHours ?? 0), 0).toFixed(0)}h` : '—'}
              icon={TrendingUp}
              iconColor="from-violet-500 to-purple-600"
            />
            <ReportCard
              title="Avg Utilization"
              value={projects.data && projects.data.entries.length > 0
                ? `${(projects.data.entries.reduce((s, e) => s + (e.utilizationPercent ?? 0), 0) / projects.data.entries.length).toFixed(1)}%`
                : '—'}
              icon={BarChart2}
              iconColor="from-amber-500 to-orange-500"
            />
          </div>

          {/* Charts row — Logged vs Allocated + Utilization % */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-500" />
                  Logged vs Allocated Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportBarChart
                  height={220}
                  data={(projects.data?.entries ?? []).map((e) => ({
                    name: e.projectName.length > 14 ? e.projectName.slice(0, 14) + '…' : e.projectName,
                    Logged: parseFloat(e.loggedHours.toFixed(1)),
                    Allocated: parseFloat(e.allocatedHours.toFixed(1)),
                  }))}
                  bars={[
                    { key: 'Logged',    label: 'Logged (h)',    color: '#6366f1' },
                    { key: 'Allocated', label: 'Allocated (h)', color: '#10b981' },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Utilization % by Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportBarChart
                  height={220}
                  data={(projects.data?.entries ?? []).map((e) => ({
                    name: e.projectName.length > 14 ? e.projectName.slice(0, 14) + '…' : e.projectName,
                    Utilization: parseFloat((e.utilizationPercent ?? 0).toFixed(1)),
                  }))}
                  bars={[{ key: 'Utilization', label: 'Utilization %', color: '#f59e0b' }]}
                />
              </CardContent>
            </Card>
          </div>

          {/* 3-col row: Members pie + detail table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-500" />
                  Members per Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportPieChart
                  height={230}
                  data={(projects.data?.entries ?? [])
                    .filter((e) => e.activeEmployees > 0)
                    .map((e) => ({ name: e.projectName, value: e.activeEmployees }))}
                  innerRadius={50}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-blue-500" />
                  Project Hours Detail
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pt-3 pb-4">
                <ReportTable<ProjectUtilizationEntry>
                  data={projects.data?.entries ?? []}
                  columns={[
                    {
                      key: 'projectName',
                      header: 'Project',
                      sortable: true,
                    },
                    {
                      key: 'activeEmployees',
                      header: 'Members',
                      sortable: true,
                      align: 'center',
                    },
                    {
                      key: 'allocatedHours',
                      header: 'Allocated (h)',
                      sortable: true,
                      align: 'right',
                      render: (v) => {
                        const n = Number(v)
                        if (n === 0) return <span className="text-muted-foreground text-xs">No estimate</span>
                        return <span className="font-mono text-sm tabular-nums">{n.toFixed(1)}</span>
                      },
                    },
                    {
                      key: 'loggedHours',
                      header: 'Logged (h)',
                      sortable: true,
                      align: 'right',
                      render: (v) => (
                        <span className="font-mono font-semibold text-sm tabular-nums">
                          {Number(v).toFixed(1)}
                        </span>
                      ),
                    },
                    {
                      key: 'utilizationPercent',
                      header: 'Utilization',
                      sortable: true,
                      align: 'right',
                      render: (v, row) => {
                        const entry = row as ProjectUtilizationEntry
                        if (entry.allocatedHours === 0) {
                          return <span className="text-xs text-muted-foreground">—</span>
                        }
                        const pct = Number(v)
                        const barColor =
                          pct >= 100 ? 'bg-red-500'     :
                          pct >= 80  ? 'bg-amber-500'   :
                          pct >= 40  ? 'bg-emerald-500' : 'bg-blue-400'
                        const textColor =
                          pct >= 100 ? 'text-red-600 dark:text-red-400'       :
                          pct >= 80  ? 'text-amber-600 dark:text-amber-400'   :
                                       'text-emerald-600 dark:text-emerald-400'
                        return (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className={`font-mono text-xs font-semibold w-10 text-right tabular-nums ${textColor}`}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        )
                      },
                    },
                  ]}
                  searchable
                  searchKeys={['projectName']}
                  emptyMessage="No project data for the selected period"
                />
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* ── Overtime & Compliance tab ─────────────────────────────────────── */}
      {!isLoading && activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReportCard
              title="Employees w/ Overtime"
              value={overtime.data?.affectedEmployees ?? '—'}
              icon={Zap}
              iconColor="from-amber-500 to-orange-500"
            />
            <ReportCard
              title="Total Overtime Hours"
              value={overtime.data ? `${overtime.data.totalOvertimeHours.toFixed(0)}h` : '—'}
              icon={Clock}
              iconColor="from-red-500 to-rose-600"
            />
            <ReportCard
              title="Team Compliance"
              value={compliance.data ? `${compliance.data.overallCompliancePercent.toFixed(1)}%` : '—'}
              icon={ShieldCheck}
              iconColor="from-emerald-500 to-teal-600"
            />
          </div>

          {/* Overtime table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Overtime Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable<OvertimeSummaryEntry>
                data={overtime.data?.entries ?? []}
                columns={[
                  { key: 'employeeName',   header: 'Team Member', sortable: true },
                  { key: 'department',     header: 'Department',  sortable: true },
                  { key: 'weekStartDate',  header: 'Week',        sortable: true },
                  { key: 'totalHours',     header: 'Total (h)',   align: 'right', sortable: true,
                    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
                  { key: 'overtimeHours',  header: 'Overtime (h)',align: 'right', sortable: true,
                    render: (v) => <span className="font-mono text-red-600 dark:text-red-400 font-semibold">{Number(v).toFixed(1)}</span> },
                  { key: 'overtimeReason', header: 'Reason',
                    render: (v) => <span className="text-muted-foreground">{String(v ?? '—')}</span> },
                ]}
                searchable
                searchKeys={['employeeName', 'department']}
                emptyMessage="No overtime found for the selected period"
              />
            </CardContent>
          </Card>

          {/* Compliance table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Timesheet Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable<TimesheetComplianceEntry>
                data={compliance.data?.entries ?? []}
                columns={[
                  { key: 'employeeName',     header: 'Team Member',  sortable: true },
                  { key: 'department',       header: 'Department',   sortable: true },
                  { key: 'totalTimesheets',  header: 'Total',        align: 'right', sortable: true },
                  { key: 'submitted',        header: 'Submitted',    align: 'right' },
                  { key: 'approved',         header: 'Approved',     align: 'right',
                    render: (v) => <span className="text-emerald-600 dark:text-emerald-400 font-medium">{String(v)}</span> },
                  { key: 'rejected',         header: 'Rejected',     align: 'right',
                    render: (v) => <span className="text-red-600 dark:text-red-400">{String(v)}</span> },
                  { key: 'compliancePercent',header: 'Compliance',   align: 'right', sortable: true,
                    render: (v) => {
                      const pct = Number(v)
                      return (
                        <Badge variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'destructive'} className="font-mono">
                          {pct.toFixed(0)}%
                        </Badge>
                      )
                    } },
                ]}
                searchable
                searchKeys={['employeeName', 'department']}
                emptyMessage="No compliance data for the selected period"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Team Tasks tab ────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportCard
              title="Total Tasks"
              value={tasks.data?.totalTasks ?? '—'}
              icon={ListChecks}
              iconColor="from-blue-500 to-indigo-600"
            />
            <ReportCard
              title="Completed"
              value={tasks.data?.totalCompleted ?? '—'}
              icon={CheckCircle2}
              iconColor="from-emerald-500 to-teal-600"
            />
            <ReportCard
              title="Overall Completion"
              value={tasks.data ? `${tasks.data.overallCompletionRate.toFixed(1)}%` : '—'}
              icon={TrendingUp}
              iconColor="from-violet-500 to-purple-600"
            />
            <ReportCard
              title="Hours Variance"
              value={tasks.data ? `${tasks.data.totalVariance > 0 ? '+' : ''}${tasks.data.totalVariance.toFixed(0)}h` : '—'}
              icon={Clock}
              iconColor={tasks.data && tasks.data.totalVariance > 5 ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-teal-600'}
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-blue-500" />
                Task Summary by Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable<TaskSummaryEntry>
                data={tasks.data?.entries ?? []}
                columns={[
                  { key: 'projectName',    header: 'Project',       sortable: true },
                  { key: 'totalTasks',     header: 'Total',         align: 'right', sortable: true },
                  { key: 'completedTasks', header: 'Completed',     align: 'right',
                    render: (v) => <span className="text-emerald-600 dark:text-emerald-400 font-medium">{String(v)}</span> },
                  { key: 'inProgressTasks',header: 'In Progress',   align: 'right',
                    render: (v) => <span className="text-blue-600 dark:text-blue-400">{String(v)}</span> },
                  { key: 'blockedTasks',   header: 'Blocked',       align: 'right',
                    render: (v) => Number(v) > 0
                      ? <Badge variant="destructive">{String(v)}</Badge>
                      : <span className="text-muted-foreground">0</span> },
                  { key: 'completionRate', header: 'Completion',    align: 'right', sortable: true,
                    render: (v) => {
                      const pct = Number(v)
                      const color = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      return (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="font-mono text-xs w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      )
                    } },
                  { key: 'estimatedHours', header: 'Est. (h)',      align: 'right',
                    render: (v) => <span className="font-mono text-muted-foreground">{Number(v).toFixed(1)}</span> },
                  { key: 'loggedHours',    header: 'Logged (h)',    align: 'right',
                    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
                  { key: 'variance',       header: 'Variance (h)',  align: 'right', sortable: true,
                    render: (v) => {
                      const n = Number(v)
                      return (
                        <span className={cn('font-mono font-medium', n > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
                          {n > 0 ? '+' : ''}{n.toFixed(1)}
                        </span>
                      )
                    } },
                ]}
                searchable
                searchKeys={['projectName']}
                emptyMessage="No task data found"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

