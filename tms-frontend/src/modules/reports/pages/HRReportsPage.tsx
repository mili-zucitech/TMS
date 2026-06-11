import { useMemo, useState } from 'react'
import {
  Users,
  Clock,
  CalendarOff,
  Building2,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Activity,
  Zap,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, statusBadge, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportPieChart, ReportLineChart } from '../components/ReportCharts'
import { TrendInsights } from '../components/TrendInsights'
import { ExportButtons, type ExportColumn, type ExportSection, type ExportChartData } from '../components/ExportButtons'
import { useHRReports } from '../hooks/useReports'
import type {
  LeaveReportEntry,
  DepartmentProductivityEntry,
  EmployeeHoursEntry,
  OvertimeSummaryEntry,
  TimesheetComplianceEntry,
} from '../types/report.types'

// ── Export column definitions ────────────────────────────────────────────────
const workHoursExportCols: ExportColumn[] = [
  { key: 'employeeName',  label: 'Employee' },
  { key: 'department',    label: 'Department' },
  { key: 'weekStartDate', label: 'Week Start Date' },
  { key: 'totalHours',    label: 'Total Hours (h)' },
]

const leaveExportCols: ExportColumn[] = [
  { key: 'employeeName', label: 'Employee' },
  { key: 'department',   label: 'Department' },
  { key: 'leaveType',    label: 'Leave Type' },
  { key: 'startDate',    label: 'Start Date' },
  { key: 'endDate',      label: 'End Date' },
  { key: 'totalDays',    label: 'Total Days' },
  { key: 'status',       label: 'Status' },
]

const deptExportCols: ExportColumn[] = [
  { key: 'departmentName',      label: 'Department' },
  { key: 'employeeCount',       label: 'Employees' },
  { key: 'totalHours',          label: 'Total Hours (h)' },
  { key: 'avgHoursPerEmployee', label: 'Avg Hours / Employee' },
  { key: 'utilizationPercent',  label: 'Utilization %' },
]

const overtimeExportCols: ExportColumn[] = [
  { key: 'employeeName',   label: 'Employee' },
  { key: 'department',     label: 'Department' },
  { key: 'weekStartDate',  label: 'Week' },
  { key: 'totalHours',     label: 'Total Hours (h)' },
  { key: 'overtimeHours',  label: 'Overtime Hours (h)' },
  { key: 'overtimeReason', label: 'Reason' },
]

const complianceExportCols: ExportColumn[] = [
  { key: 'employeeName',     label: 'Employee' },
  { key: 'department',       label: 'Department' },
  { key: 'totalTimesheets',  label: 'Total Timesheets' },
  { key: 'submitted',        label: 'Submitted' },
  { key: 'approved',         label: 'Approved' },
  { key: 'rejected',         label: 'Rejected' },
  { key: 'draft',            label: 'Draft' },
  { key: 'compliancePercent',label: 'Compliance %' },
]

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'work-hours',  label: 'Work Hours' },
  { id: 'leave',       label: 'Leave Analytics' },
  { id: 'departments', label: 'Departments' },
  { id: 'overtime',    label: 'Overtime Analysis' },
  { id: 'compliance',  label: 'Timesheet Compliance' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Work Hours columns ────────────────────────────────────────────────────────
const workHoursCols: Column<EmployeeHoursEntry>[] = [
  { key: 'employeeName', header: 'Employee',   sortable: true },
  { key: 'department',   header: 'Department', sortable: true },
  { key: 'weekStartDate',header: 'Week Of',    sortable: true },
  { key: 'totalHours',   header: 'Total Hours',  sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
]

// ── Leave columns ─────────────────────────────────────────────────────────────
const leaveCols: Column<LeaveReportEntry>[] = [
  { key: 'employeeName', header: 'Employee',    sortable: true },
  { key: 'department',   header: 'Department',  sortable: true },
  { key: 'leaveType',    header: 'Leave Type',  sortable: true },
  { key: 'totalDays',    header: 'Days',        sortable: true, align: 'right' },
  { key: 'startDate',    header: 'From',        sortable: true },
  { key: 'endDate',      header: 'To',          sortable: true },
  { key: 'status',       header: 'Status',      sortable: true,
    render: (v) => statusBadge(String(v)) },
]

// ── Department columns ────────────────────────────────────────────────────────
const deptCols: Column<DepartmentProductivityEntry>[] = [
  { key: 'departmentName',      header: 'Department',       sortable: true },
  { key: 'employeeCount',       header: 'Employees',        sortable: true, align: 'right' },
  { key: 'totalHours',          header: 'Total Hours',        sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'avgHoursPerEmployee', header: 'Avg Hours/Employee', sortable: true, align: 'right',
    render: (v) => <span className="font-mono">{Number(v).toFixed(1)}</span> },
  { key: 'utilizationPercent',   header: 'Utilization',       sortable: true, align: 'right',
    render: (v) => (
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Number(v), 100)}%` }} />
        </div>
        <span className="font-mono text-xs">{Number(v)}%</span>
      </div>
    ) },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HRReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { hours, leave, dept, overtime, compliance, isLoading, error, applyFilters, refresh } = useHRReports()

  const exportData = useMemo(() => {
    if (activeTab === 'leave')       return leave.data?.entries ?? []
    if (activeTab === 'departments') return dept.data ?? []
    if (activeTab === 'overtime')    return overtime.data?.entries ?? []
    if (activeTab === 'compliance')  return compliance.data?.entries ?? []
    return hours.data?.entries ?? []
  }, [activeTab, hours.data, leave.data, dept.data, overtime.data, compliance.data])

  const exportColumns = useMemo(() => {
    if (activeTab === 'leave')       return leaveExportCols
    if (activeTab === 'departments') return deptExportCols
    if (activeTab === 'overtime')    return overtimeExportCols
    if (activeTab === 'compliance')  return complianceExportCols
    return workHoursExportCols
  }, [activeTab])

  const exportReportTitle = useMemo(() => {
    if (activeTab === 'leave')       return 'HR Leave Report'
    if (activeTab === 'departments') return 'HR Department Productivity Report'
    if (activeTab === 'overtime')    return 'HR Overtime Analysis Report'
    if (activeTab === 'compliance')  return 'HR Timesheet Compliance Report'
    return 'HR Work Hours Report'
  }, [activeTab])

  // ── Chart data derivations ────────────────────────────────────────────────
  const empPerDeptPie = useMemo(() => {
    if (!dept.data) return []
    return dept.data.map((d) => ({ name: d.departmentName, value: d.employeeCount }))
  }, [dept.data])

  const leaveDistBar = useMemo(() => {
    if (!leave.data) return []
    const map = new Map<string, number>()
    for (const e of leave.data.entries) {
      map.set(e.leaveType, (map.get(e.leaveType) ?? 0) + e.totalDays)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [leave.data])

  const attendanceTrendLine = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      const week = e.weekStartDate ?? 'Unknown'
      map.set(week, (map.get(week) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const deptHoursBar = useMemo(() => {
    if (!dept.data) return []
    return dept.data
      .map((d) => ({ name: d.departmentName, value: d.totalHours }))
      .sort((a, b) => b.value - a.value)
  }, [dept.data])

  const deptUtilBar = useMemo(() => {
    if (!dept.data) return []
    return dept.data
      .map((d) => ({ name: d.departmentName, value: d.utilizationPercent }))
      .sort((a, b) => b.value - a.value)
  }, [dept.data])

  const empHoursBar = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      map.set(e.employeeName, (map.get(e.employeeName) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const leaveStatusPie = useMemo(() => [
    { name: 'Approved', value: leave.data?.totalApproved ?? 0 },
    { name: 'Pending',  value: leave.data?.totalPending  ?? 0 },
    { name: 'Rejected', value: leave.data?.totalRejected ?? 0 },
  ].filter((d) => d.value > 0), [leave.data])

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">HR Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Operational analytics — employees, leave, and department productivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButtons sections={allSections} filename="hr-full-report" reportTitle="HR Full Report" />
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <ReportFilters
        filters={{}}
        onApply={applyFilters}
        showDepartment
        showEmployee
        showLeaveType
      />

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReportCard
          title="Total Employees"
          value={hours.data?.employeeCount ?? '—'}
          icon={Users}
          iconColor="from-blue-500 to-blue-600"
        />
        <ReportCard
          title="Total Hours Logged"
          value={hours.data ? `${hours.data.totalHours.toFixed(0)}h` : '—'}
          icon={Clock}
          iconColor="from-emerald-500 to-teal-600"
        />
        <ReportCard
          title="Leave Days Taken"
          value={leave.data?.totalDays ?? '—'}
          icon={CalendarOff}
          iconColor="from-amber-500 to-orange-500"
        />
        <ReportCard
          title="Departments"
          value={dept.data?.length ?? '—'}
          icon={Building2}
          iconColor="from-violet-500 to-purple-600"
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

      {/* ── Loading skeleton ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {/* ── Overview tab ────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'overview' && (
        <div className="space-y-4">
          <TrendInsights
            hours={hours.data}
            leave={leave.data}
            title="HR Trend Insights"
          />
          <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                Employees per Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart data={empPerDeptPie} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Attendance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportLineChart
                data={attendanceTrendLine}
                lines={[{ key: 'value', label: 'Total Hours' }]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-amber-500" />
                Leave Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={leaveDistBar}
                bars={[{ key: 'value', label: 'Days' }]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Hours by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={deptHoursBar}
                bars={[{ key: 'value', label: 'Total Hours', color: '#8b5cf6' }]}
              />
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* ── Work Hours tab ───────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'work-hours' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Top 15 Employees by Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={empHoursBar}
                bars={[{ key: 'value', label: 'Total Hours', color: '#10b981' }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                Employee Work Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={hours.data?.entries ?? []}
                columns={workHoursCols}
                searchable
                searchKeys={['employeeName', 'department']}
                emptyMessage="No work hours data for the selected period"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Leave tab ────────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ReportCard
              title="Approved Leaves"
              value={leave.data?.totalApproved ?? '—'}
              icon={UserCheck}
              iconColor="from-emerald-500 to-teal-600"
            />
            <ReportCard
              title="Pending Leaves"
              value={leave.data?.totalPending ?? '—'}
              icon={Clock}
              iconColor="from-amber-500 to-orange-500"
            />
            <ReportCard
              title="Rejected Leaves"
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
                searchKeys={['employeeName', 'leaveType', 'department']}
                emptyMessage="No leave data for the selected period"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Departments tab ─────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Total Hours by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportBarChart
                  data={deptHoursBar}
                  bars={[{ key: 'value', label: 'Total Hours', color: '#3b82f6' }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Utilization % by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportBarChart
                  data={deptUtilBar}
                  bars={[{ key: 'value', label: 'Utilization %', color: '#10b981' }]}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-500" />
                Department Productivity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={dept.data ?? []}
                columns={deptCols}
                searchable
                searchKeys={['departmentName']}
                emptyMessage="No department data available"
              />
            </CardContent>
          </Card>
        </div>
      )}
      {/* ── Overtime Analysis tab ───────────────────────────────────────── */}
      {!isLoading && activeTab === 'overtime' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReportCard
              title="Employees w/ Overtime"
              value={overtime.data?.affectedEmployees ?? '—'}
              icon={Zap}
              iconColor="from-amber-500 to-orange-500"
            />
            <ReportCard
              title="Total Overtime Weeks"
              value={overtime.data?.totalOvertimeWeeks ?? '—'}
              icon={Clock}
              iconColor="from-red-500 to-rose-600"
            />
            <ReportCard
              title="Total Overtime Hours"
              value={overtime.data ? `${overtime.data.totalOvertimeHours.toFixed(0)}h` : '—'}
              icon={TrendingUp}
              iconColor="from-violet-500 to-purple-600"
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Top Overtime Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={(() => {
                  const map = new Map<string, number>()
                  for (const e of overtime.data?.entries ?? []) {
                    map.set(e.employeeName, (map.get(e.employeeName) ?? 0) + e.overtimeHours)
                  }
                  return Array.from(map.entries())
                    .sort((a, b) => b[1] - a[1]).slice(0, 15)
                    .map(([name, value]) => ({ name, value }))
                })()}
                bars={[{ key: 'value', label: 'Overtime Hours (h)', color: '#f59e0b' }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Overtime Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable<OvertimeSummaryEntry>
                data={overtime.data?.entries ?? []}
                columns={[
                  { key: 'employeeName',   header: 'Employee',     sortable: true },
                  { key: 'department',     header: 'Department',   sortable: true },
                  { key: 'weekStartDate',  header: 'Week',         sortable: true },
                  { key: 'totalHours',     header: 'Total (h)',    align: 'right', sortable: true,
                    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
                  { key: 'overtimeHours',  header: 'Overtime (h)', align: 'right', sortable: true,
                    render: (v) => <span className="font-mono text-red-600 dark:text-red-400 font-semibold">{Number(v).toFixed(1)}</span> },
                  { key: 'overtimeReason', header: 'Reason',
                    render: (v) => <span className="text-muted-foreground text-sm">{String(v ?? '—')}</span> },
                ]}
                searchable
                searchKeys={['employeeName', 'department']}
                emptyMessage="No overtime found for the selected period"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Timesheet Compliance tab ──────────────────────────────────── */}
      {!isLoading && activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportCard
              title="Overall Compliance"
              value={compliance.data ? `${compliance.data.overallCompliancePercent.toFixed(1)}%` : '—'}
              icon={ShieldCheck}
              iconColor="from-emerald-500 to-teal-600"
            />
            <ReportCard
              title="Total Timesheets"
              value={compliance.data?.totalTimesheets ?? '—'}
              icon={Clock}
              iconColor="from-blue-500 to-indigo-600"
            />
            <ReportCard
              title="Total Approved"
              value={compliance.data?.totalApproved ?? '—'}
              icon={UserCheck}
              iconColor="from-violet-500 to-purple-600"
            />
            <ReportCard
              title="Total Rejected"
              value={compliance.data?.totalRejected ?? '—'}
              icon={CalendarOff}
              iconColor="from-red-500 to-rose-600"
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Compliance by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={(() => {
                  const map = new Map<string, { total: number; approved: number }>()
                  for (const e of compliance.data?.entries ?? []) {
                    const prev = map.get(e.department) ?? { total: 0, approved: 0 }
                    map.set(e.department, { total: prev.total + e.totalTimesheets, approved: prev.approved + e.approved })
                  }
                  return Array.from(map.entries()).map(([name, v]) => ({
                    name,
                    value: v.total > 0 ? Math.round((v.approved / v.total) * 100) : 0,
                  }))
                })()}
                bars={[{ key: 'value', label: 'Compliance %', color: '#10b981' }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Employee Compliance Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable<TimesheetComplianceEntry>
                data={compliance.data?.entries ?? []}
                columns={[
                  { key: 'employeeName',     header: 'Employee',    sortable: true },
                  { key: 'department',       header: 'Department',  sortable: true },
                  { key: 'totalTimesheets',  header: 'Total',       align: 'right', sortable: true },
                  { key: 'submitted',        header: 'Submitted',   align: 'right' },
                  { key: 'approved',         header: 'Approved',    align: 'right',
                    render: (v) => <span className="text-emerald-600 dark:text-emerald-400 font-medium">{String(v)}</span> },
                  { key: 'rejected',         header: 'Rejected',    align: 'right',
                    render: (v) => <span className="text-red-600 dark:text-red-400">{String(v)}</span> },
                  { key: 'compliancePercent',header: 'Compliance',  align: 'right', sortable: true,
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
    </div>
  )
}
