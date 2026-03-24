import { useMemo, useState } from 'react'
import {
  Users,
  Clock,
  CalendarOff,
  Building2,
  RefreshCw,
  UserCheck,
  Activity,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, statusBadge, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportPieChart, ReportLineChart } from '../components/ReportCharts'
import { ExportButtons } from '../components/ExportButtons'
import { TrendInsights } from '../components/TrendInsights'
import {
  useEmployeeHoursReport,
  useLeaveReport,
  useDepartmentProductivityReport,
} from '../hooks/useReports'
import type {
  EmployeeHoursEntry,
  LeaveReportEntry,
  DepartmentProductivityEntry,
  ReportFilters as Filters,
} from '../types/report.types'

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'work-hours',  label: 'Work Hours' },
  { id: 'leave',       label: 'Leave Analytics' },
  { id: 'departments', label: 'Departments' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Column definitions ────────────────────────────────────────────────────────
const workHoursCols: Column<EmployeeHoursEntry>[] = [
  { key: 'employeeName',  header: 'Employee',   sortable: true },
  { key: 'department',    header: 'Department', sortable: true },
  { key: 'totalHours',    header: 'Total Hours',  sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'weekStartDate', header: 'Week Of',    sortable: true },
]

const leaveCols: Column<LeaveReportEntry>[] = [
  { key: 'employeeName', header: 'Employee',   sortable: true },
  { key: 'department',   header: 'Department', sortable: true },
  { key: 'leaveType',    header: 'Leave Type', sortable: true },
  { key: 'totalDays',    header: 'Days',       sortable: true, align: 'right' },
  { key: 'startDate',    header: 'From',       sortable: true },
  { key: 'endDate',      header: 'To',         sortable: true },
  { key: 'status',       header: 'Status',     sortable: true,
    render: (v) => statusBadge(String(v)) },
]

const deptCols: Column<DepartmentProductivityEntry>[] = [
  { key: 'departmentName',      header: 'Department',       sortable: true },
  { key: 'employeeCount',       header: 'Employees',        sortable: true, align: 'right' },
  { key: 'totalHours',          header: 'Total Hours',        sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'avgHoursPerEmployee', header: 'Avg Hours/Employee', sortable: true, align: 'right',
    render: (v) => <span className="font-mono">{Number(v).toFixed(1)}</span> },
  { key: 'utilizationPercent',   header: 'Utilization',      sortable: true, align: 'right',
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
export default function HRManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const hours = useEmployeeHoursReport()
  const leave = useLeaveReport()
  const dept  = useDepartmentProductivityReport()

  const isLoading = hours.isLoading || leave.isLoading || dept.isLoading
  const error     = hours.error ?? leave.error ?? dept.error ?? null

  const applyFilters = (f: Filters) => {
    hours.applyFilters(f)
    leave.applyFilters(f)
    dept.applyFilters(f)
  }

  const refresh = () => {
    hours.refresh()
    leave.refresh()
    dept.refresh()
  }

  // ── Chart data ────────────────────────────────────────────────────────────
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

  // Active export data per tab
  const exportData = useMemo(() => {
    switch (activeTab) {
      case 'work-hours':  return hours.data?.entries ?? []
      case 'leave':       return leave.data?.entries ?? []
      case 'departments': return dept.data           ?? []
      default:            return hours.data?.entries ?? []
    }
  }, [activeTab, hours.data, leave.data, dept.data])

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">HR Manager Reports</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
              <ShieldCheck className="h-3 w-3" />
              HR Manager
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Full operational visibility — employees, leave, and department productivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButtons data={exportData} filename={`hr-manager-report-${activeTab}`} />
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <ReportFilters
        filters={{}}
        onApply={applyFilters}
        showDepartment
        showEmployee
        showProject
        showLeaveType
      />

      {/* ── KPI Cards (row 1) ────────────────────────────────────────────────── */}
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
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'overview' && (
        <div className="space-y-4">
          <TrendInsights
            hours={hours.data}
            leave={leave.data}
            title="HR Manager Trend Insights"
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
                lines={[{ key: 'value', label: 'Total Hours', color: '#10b981' }]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-amber-500" />
                Leave Distribution by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={leaveDistBar}
                bars={[{ key: 'value', label: 'Days', color: '#f59e0b' }]}
              />
            </CardContent>
          </Card>

          {/* Leave status summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-rose-500" />
                Leave Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart
                data={[
                  { name: 'Approved', value: leave.data?.totalApproved ?? 0 },
                  { name: 'Pending',  value: leave.data?.totalPending  ?? 0 },
                  { name: 'Rejected', value: leave.data?.totalRejected ?? 0 },
                ].filter((d) => d.value > 0)}
                innerRadius={50}
              />
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* ── Work Hours tab ────────────────────────────────────────────────────── */}
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

      {/* ── Leave tab ─────────────────────────────────────────────────────────── */}
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
                <ReportPieChart
                  data={[
                    { name: 'Approved', value: leave.data?.totalApproved ?? 0 },
                    { name: 'Pending',  value: leave.data?.totalPending  ?? 0 },
                    { name: 'Rejected', value: leave.data?.totalRejected ?? 0 },
                  ].filter((d) => d.value > 0)}
                  innerRadius={45}
                />
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

      {/* ── Departments tab ───────────────────────────────────────────────────── */}
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

    </div>
  )
}
