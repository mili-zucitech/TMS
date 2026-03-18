import { useMemo, useState } from 'react'
import {
  Users,
  Clock,
  CalendarOff,
  Building2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  UserCheck,
  Activity,
  BarChart2,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, statusBadge, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportPieChart, ReportLineChart } from '../components/ReportCharts'
import { ExportButtons } from '../components/ExportButtons'
import {
  useEmployeeHoursReport,
  useLeaveReport,
  useDepartmentProductivityReport,
  useBillableHoursReport,
} from '../hooks/useReports'
import type {
  EmployeeHoursEntry,
  LeaveReportEntry,
  DepartmentProductivityEntry,
  BillableHoursEntry,
  ReportFilters as Filters,
} from '../types/report.types'

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'work-hours',   label: 'Work Hours' },
  { id: 'leave',        label: 'Leave Analytics' },
  { id: 'departments',  label: 'Departments' },
  { id: 'billable',     label: 'Billable Hours' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Column definitions ────────────────────────────────────────────────────────
const workHoursCols: Column<EmployeeHoursEntry>[] = [
  { key: 'employeeName',     header: 'Employee',          sortable: true },
  { key: 'department',       header: 'Department',        sortable: true },
  { key: 'totalHours',       header: 'Total hrs',         sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'billableHours',    header: 'Billable hrs',      sortable: true, align: 'right',
    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'nonBillableHours', header: 'Non-billable hrs',  align: 'right',
    render: (v) => <span className="font-mono text-amber-600 dark:text-amber-400">{Number(v).toFixed(1)}</span> },
  { key: 'weekStartDate',    header: 'Week of',           sortable: true },
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
  { key: 'departmentName',       header: 'Department',       sortable: true },
  { key: 'employeeCount',        header: 'Employees',        sortable: true, align: 'right' },
  { key: 'totalHours',           header: 'Total hrs',        sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'billableHours',        header: 'Billable hrs',     sortable: true, align: 'right',
    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400">{Number(v).toFixed(1)}</span> },
  { key: 'avgHoursPerEmployee',  header: 'Avg hrs/employee', sortable: true, align: 'right',
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

const billableCols: Column<BillableHoursEntry>[] = [
  { key: 'employeeName',    header: 'Employee',     sortable: true },
  { key: 'department',      header: 'Department',   sortable: true },
  { key: 'projectName',     header: 'Project',      sortable: true },
  { key: 'totalHours',      header: 'Total hrs',    sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'billableHours',   header: 'Billable',     sortable: true, align: 'right',
    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'billablePercent', header: 'Billable %',   sortable: true, align: 'right',
    render: (v) => (
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Number(v), 100)}%` }} />
        </div>
        <span className="font-mono text-xs">{Number(v)}%</span>
      </div>
    ) },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HRManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const hours    = useEmployeeHoursReport()
  const leave    = useLeaveReport()
  const dept     = useDepartmentProductivityReport()
  const billable = useBillableHoursReport()

  const isLoading = hours.isLoading || leave.isLoading || dept.isLoading || billable.isLoading
  const error     = hours.error ?? leave.error ?? dept.error ?? billable.error ?? null

  const applyFilters = (f: Filters) => {
    hours.applyFilters(f)
    leave.applyFilters(f)
    dept.applyFilters(f)
    billable.applyFilters(f)
  }

  const refresh = () => {
    hours.refresh()
    leave.refresh()
    dept.refresh()
    billable.refresh()
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

  const deptHoursBar = useMemo(() => {
    if (!dept.data) return []
    return dept.data.map((d) => ({
      name: d.departmentName,
      billable: d.billableHours,
      nonBillable: d.totalHours - d.billableHours,
    }))
  }, [dept.data])

  const billablePie = useMemo(() => {
    if (!billable.data) return []
    return [
      { name: 'Billable',     value: billable.data.totalBillableHours },
      { name: 'Non-Billable', value: billable.data.totalNonBillableHours },
    ]
  }, [billable.data])

  const utilizationRate = billable.data
    ? Math.round((billable.data.totalBillableHours / (billable.data.totalHours || 1)) * 100)
    : 0

  // Active export data per tab
  const exportData = useMemo(() => {
    switch (activeTab) {
      case 'work-hours':   return hours.data?.entries    ?? []
      case 'leave':        return leave.data?.entries    ?? []
      case 'departments':  return dept.data              ?? []
      case 'billable':     return billable.data?.entries ?? []
      default:             return hours.data?.entries    ?? []
    }
  }, [activeTab, hours.data, leave.data, dept.data, billable.data])

  return (
    <div className="space-y-6 p-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">HR Manager Reports</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
              <ShieldCheck className="h-3 w-3" />
              HR Manager
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Full operational visibility — employees, leave, departments, and billable tracking
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

      {/* ── KPI Cards (row 2) ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ReportCard
          title="Billable Hours"
          value={billable.data ? `${billable.data.totalBillableHours.toFixed(0)}h` : '—'}
          icon={DollarSign}
          iconColor="from-green-500 to-emerald-600"
        />
        <ReportCard
          title="Utilization Rate"
          value={`${utilizationRate}%`}
          icon={TrendingUp}
          iconColor="from-sky-500 to-cyan-600"
        />
        <ReportCard
          title="Pending Leaves"
          value={leave.data?.totalPending ?? '—'}
          icon={UserCheck}
          iconColor="from-rose-500 to-pink-600"
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
        <div className="grid gap-6 md:grid-cols-2">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Department Hours Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={deptHoursBar}
                bars={[
                  { key: 'billable',    label: 'Billable',     color: '#10b981' },
                  { key: 'nonBillable', label: 'Non-Billable', color: '#f59e0b' },
                ]}
                stacked
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-sky-500" />
                Billable vs Non-Billable (Org-wide)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart data={billablePie} />
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
      )}

      {/* ── Work Hours tab ────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'work-hours' && (
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
      )}

      {/* ── Leave tab ─────────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'leave' && (
        <div className="space-y-6">
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
      )}

      {/* ── Billable tab ──────────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'billable' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Billable Hours by Employee &amp; Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable
              data={billable.data?.entries ?? []}
              columns={billableCols}
              searchable
              searchKeys={['employeeName', 'department', 'projectName']}
              emptyMessage="No billable hours data for the selected period"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
