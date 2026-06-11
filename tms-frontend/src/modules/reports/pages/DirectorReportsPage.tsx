import { useMemo, useState } from 'react'
import {
  Clock,
  TrendingUp,
  Users,
  FolderKanban,
  RefreshCw,
  Briefcase,
  Activity,
  Building2,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ListChecks,
  Timer,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportLineChart, ReportPieChart } from '../components/ReportCharts'
import { TrendInsights } from '../components/TrendInsights'
import { ExportButtons, type ExportColumn, type ExportSection, type ExportChartData } from '../components/ExportButtons'  
import { useDirectorReports } from '../hooks/useReports'
import type {
  ProjectUtilizationEntry,
  DepartmentProductivityEntry,
  OvertimeSummaryEntry,
  TimesheetComplianceEntry,
  ApprovalTurnaroundEntry,
} from '../types/report.types'

const projectExportCols: ExportColumn[] = [
  { key: 'projectName',        label: 'Project' },
  { key: 'activeEmployees',    label: 'Active Employees' },
  { key: 'loggedHours',        label: 'Logged Hours (h)' },
  { key: 'allocatedHours',     label: 'Allocated Hours (h)' },
  { key: 'utilizationPercent', label: 'Utilization %' },
]

const workforceExportCols: ExportColumn[] = [
  { key: 'employeeName',  label: 'Employee' },
  { key: 'department',    label: 'Department' },
  { key: 'weekStartDate', label: 'Week Start Date' },
  { key: 'totalHours',    label: 'Total Hours (h)' },
]

const deptExportCols: ExportColumn[] = [
  { key: 'departmentName',      label: 'Department' },
  { key: 'employeeCount',       label: 'Employees' },
  { key: 'totalHours',          label: 'Total Hours (h)' },
  { key: 'avgHoursPerEmployee', label: 'Avg Hours / Employee' },
  { key: 'utilizationPercent',  label: 'Utilization %' },
]

const turnaroundExportCols: ExportColumn[] = [
  { key: 'managerName',      label: 'Manager' },
  { key: 'totalApproved',    label: 'Total Approved' },
  { key: 'avgDaysToApprove', label: 'Avg Days to Approve' },
  { key: 'minDaysToApprove', label: 'Min Days' },
  { key: 'maxDaysToApprove', label: 'Max Days' },
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
  { id: 'executive',          label: 'Executive Summary' },
  { id: 'projects',           label: 'Project Utilization' },
  { id: 'workforce',          label: 'Workforce Trends' },
  { id: 'dept-performance',   label: 'Dept Performance' },
  { id: 'approval-turnaround',label: 'Approval Turnaround' },
  { id: 'org-compliance',     label: 'Org Compliance' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Project utilization columns ───────────────────────────────────────────────
const projectCols: Column<ProjectUtilizationEntry>[] = [
  { key: 'projectName',        header: 'Project',          sortable: true },
  { key: 'activeEmployees',    header: 'Active Employees', sortable: true, align: 'right' },
  { key: 'allocatedHours',     header: 'Allocated Hours',    sortable: true, align: 'right',
    render: (v) => <span className="font-mono">{Number(v).toFixed(0)}</span> },
  { key: 'loggedHours',        header: 'Logged Hours',       sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(0)}</span> },
  { key: 'utilizationPercent', header: 'Utilization',      sortable: true, align: 'right',
    render: (v) => (
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${Number(v) >= 80 ? 'bg-emerald-500' : Number(v) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(Number(v), 100)}%` }}
          />
        </div>
        <span className="font-mono text-xs font-semibold">{Number(v)}%</span>
      </div>
    ) },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DirectorReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('executive')
  const { hours, projects, kpi, dept, turnaround, compliance, overtime, isLoading, error, applyFilters, refresh } = useDirectorReports()

  // ── Chart data derivations ────────────────────────────────────────────────
  const orgProductivityLine = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      const week = e.weekStartDate ?? 'Unknown'
      map.set(week, (map.get(week) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-16)
      .map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const projectUtilBar = useMemo(() => {
    if (!projects.data) return []
    return projects.data.entries
      .slice(0, 12)
      .map((p) => ({ name: p.projectName, value: p.utilizationPercent }))
  }, [projects.data])

  const workforceBar = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      const dept = e.department || 'Unknown'
      map.set(dept, (map.get(dept) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const topProjects = useMemo(() => {
    if (!projects.data) return []
    return [...projects.data.entries]
      .sort((a, b) => b.loggedHours - a.loggedHours)
      .slice(0, 5)
  }, [projects.data])

  const deptEmpPie = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, Set<string>>()
    for (const e of hours.data.entries) {
      const dept = e.department || 'Unknown'
      if (!map.has(dept)) map.set(dept, new Set())
      map.get(dept)!.add(e.employeeName)
    }
    return Array.from(map.entries()).map(([name, set]) => ({ name, value: set.size }))
  }, [hours.data])

  const topEmployees = useMemo(() => {
    if (!hours.data) return []
    const map = new Map<string, { employeeName: string; department: string; totalHours: number }>()
    for (const e of hours.data.entries) {
      const existing = map.get(e.employeeName)
      if (existing) {
        existing.totalHours += e.totalHours
      } else {
        map.set(e.employeeName, { employeeName: e.employeeName, department: e.department ?? '', totalHours: e.totalHours })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10)
  }, [hours.data])

  // Submission compliance: % of employees who have entries in the most recent week
  const submissionCompliance = useMemo(() => {
    if (!hours.data || hours.data.entries.length === 0) return null
    const allEmployees = new Set(hours.data.entries.map((e) => e.userId))
    const weekMap = new Map<string, Set<string>>()
    for (const e of hours.data.entries) {
      const w = e.weekStartDate ?? 'unknown'
      if (!weekMap.has(w)) weekMap.set(w, new Set())
      weekMap.get(w)!.add(e.userId)
    }
    const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => b.localeCompare(a))
    if (sortedWeeks.length === 0) return null
    // Employees who logged in every week = consistent submitters
    const totalWeeks = sortedWeeks.length
    const consistent = Array.from(allEmployees).filter(
      (id) => sortedWeeks.filter((w) => weekMap.get(w)?.has(id)).length >= totalWeeks,
    ).length
    return allEmployees.size > 0 ? Math.round((consistent / allEmployees.size) * 100) : 0
  }, [hours.data])

  const allSections = useMemo<ExportSection[]>(() => [
    {
      title: 'Workforce Hours', data: hours.data?.entries ?? [], columns: workforceExportCols,
      charts: [
        { title: 'Hours by Department',      type: 'bar' as const, data: workforceBar,           valueLabel: 'Hours (h)' },
        { title: 'Org Productivity Trend',   type: 'line' as const, data: orgProductivityLine,  valueLabel: 'Total Hours' },
        { title: 'Employees per Department', type: 'pie' as const, data: deptEmpPie },
      ],
    },
    {
      title: 'Project Utilization', data: projects.data?.entries ?? [], columns: projectExportCols,
      charts: [
        { title: 'Project Utilization %',  type: 'bar' as const, data: projectUtilBar, valueLabel: 'Utilization %' } as ExportChartData,
        { title: 'Logged Hours by Project', type: 'bar' as const, data: (projects.data?.entries ?? []).map((p) => ({ name: p.projectName, value: p.loggedHours })), valueLabel: 'Logged Hours (h)' } as ExportChartData,
      ],
    },
    {
      title: 'Department Performance', data: dept.data ?? [], columns: deptExportCols,
      charts: [
        { title: 'Hours by Department',       type: 'bar' as const, data: (dept.data ?? []).map((d) => ({ name: d.departmentName, value: d.totalHours })), valueLabel: 'Hours (h)' } as ExportChartData,
        { title: 'Utilization by Department', type: 'bar' as const, data: (dept.data ?? []).map((d) => ({ name: d.departmentName, value: d.utilizationPercent })), valueLabel: 'Utilization %' } as ExportChartData,
      ],
    },
    {
      title: 'Approval Turnaround', data: turnaround.data?.entries ?? [], columns: turnaroundExportCols,
      charts: [
        { title: 'Avg Days to Approve by Manager', type: 'bar' as const, data: (turnaround.data?.entries ?? []).map((e) => ({ name: e.managerName, value: e.avgDaysToApprove })), valueLabel: 'Days' } as ExportChartData,
      ],
    },
    {
      title: 'Org Compliance', data: compliance.data?.entries ?? [], columns: complianceExportCols,
      charts: [
        { title: 'Compliance % per Employee', type: 'bar' as const, data: (compliance.data?.entries ?? []).map((e) => ({ name: e.employeeName, value: e.compliancePercent })), valueLabel: 'Compliance %' } as ExportChartData,
      ],
    },
    {
      title: 'Overtime', data: overtime.data?.entries ?? [], columns: overtimeExportCols,
      charts: [
        { title: 'Overtime Hours per Employee', type: 'bar' as const, data: (overtime.data?.entries ?? []).map((e) => ({ name: e.employeeName, value: e.overtimeHours })), valueLabel: 'Overtime Hours (h)' } as ExportChartData,
      ],
    },
  ], [hours.data, projects.data, dept.data, turnaround.data, compliance.data, overtime.data,
      workforceBar, orgProductivityLine, deptEmpPie, projectUtilBar])

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Executive Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organization-wide insights, KPIs, and strategic analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButtons sections={allSections} filename="director-full-report" reportTitle="Executive Full Report" />
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <ReportFilters
        filters={{}}
        onApply={applyFilters}
        showDepartment
        showProject
      />

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <ReportCard
          title="Total Hours Logged"
          value={kpi.data ? `${kpi.data.totalHoursLogged.toLocaleString()}h` : '—'}
          subtitle="Org-wide"
          icon={Clock}
          iconColor="from-blue-500 to-blue-600"
        />
        <ReportCard
          title="Active Employees"
          value={kpi.data?.activeEmployees ?? '—'}
          subtitle="Logged hours"
          icon={Users}
          iconColor="from-amber-500 to-orange-500"
        />
        <ReportCard
          title="Active Projects"
          value={kpi.data?.activeProjects ?? '—'}
          icon={FolderKanban}
          iconColor="from-sky-500 to-cyan-600"
        />
        <ReportCard
          title="Total Projects"
          value={projects.data?.entries.length ?? '—'}
          icon={Briefcase}
          iconColor="from-indigo-500 to-violet-600"
        />
        <ReportCard
          title="Submission Compliance"
          value={submissionCompliance !== null ? `${submissionCompliance}%` : '—'}
          subtitle="Consistent every week"
          icon={CheckCircle2}
          iconColor={submissionCompliance !== null && submissionCompliance >= 80
            ? 'from-emerald-500 to-teal-600'
            : 'from-rose-500 to-red-600'}
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

      {/* ── Executive Summary tab ────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'executive' && (
        <div className="space-y-4">
          <TrendInsights
            hours={hours.data}
            title="Executive Trend Insights"
          />
          <div className="grid gap-4 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Organization Productivity Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportLineChart
                data={orgProductivityLine}
                lines={[{ key: 'value', label: 'Total Hours', color: '#3b82f6' }]}
                height={260}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-emerald-500" />
                Project Utilization (Top 12)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={projectUtilBar}
                bars={[{ key: 'value', label: 'Utilization %', color: '#10b981' }]}
              />
            </CardContent>
          </Card>

          {/* Top projects table */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Top 5 Projects by Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={topProjects}
                columns={projectCols}
                emptyMessage="No project data available"
              />
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* ── Project Utilization tab ──────────────────────────────────────────── */}
      {!isLoading && activeTab === 'projects' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-emerald-500" />
                Project Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={projectUtilBar}
                bars={[{ key: 'value', label: 'Utilization %', color: '#10b981' }]}
                height={320}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <ReportTable
                data={projects.data?.entries ?? []}
                columns={projectCols}
                searchable
                searchKeys={['projectName']}
                emptyMessage="No project utilization data"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Workforce Trends tab ─────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'workforce' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Organization Productivity Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportLineChart
                  data={orgProductivityLine}
                  lines={[{ key: 'value', label: 'Total Hours', color: '#6366f1' }]}
                  height={280}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Hours by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportBarChart
                  data={workforceBar}
                  bars={[{ key: 'value', label: 'Total Hours', color: '#8b5cf6' }]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-sky-500" />
                  Employees per Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportPieChart data={deptEmpPie} innerRadius={45} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Top 10 Employees by Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                data={topEmployees}
                columns={[
                  { key: 'employeeName', header: 'Employee',   sortable: true },
                  { key: 'department',   header: 'Department', sortable: true },
                  { key: 'totalHours',   header: 'Total Hours',  sortable: true, align: 'right',
                    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
                ]}
                emptyMessage="No employee hours data available"
              />
            </CardContent>
          </Card>
        </div>
      )}
      {/* ── Department Performance tab ───────────────────────────────────────── */}
      {!isLoading && activeTab === 'dept-performance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportCard
              title="Departments"
              value={dept.data?.length ?? '—'}
              icon={Building2}
              iconColor="from-blue-500 to-indigo-600"
            />
            <ReportCard
              title="Total Dept Hours"
              value={dept.data ? `${dept.data.reduce((s, d) => s + d.totalHours, 0).toFixed(0)}h` : '—'}
              icon={Clock}
              iconColor="from-emerald-500 to-teal-600"
            />
            <ReportCard
              title="Avg Utilization"
              value={dept.data && dept.data.length > 0
                ? `${(dept.data.reduce((s, d) => s + d.utilizationPercent, 0) / dept.data.length).toFixed(1)}%`
                : '—'}
              icon={TrendingUp}
              iconColor="from-violet-500 to-purple-600"
            />
            <ReportCard
              title="Total Employees"
              value={dept.data ? dept.data.reduce((s, d) => s + d.employeeCount, 0) : '—'}
              icon={Users}
              iconColor="from-amber-500 to-orange-500"
            />
          </div>
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
                  data={(dept.data ?? []).map((d) => ({ name: d.departmentName, value: d.totalHours }))}
                  bars={[{ key: 'value', label: 'Total Hours (h)', color: '#3b82f6' }]}
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
                  data={(dept.data ?? []).map((d) => ({ name: d.departmentName, value: d.utilizationPercent }))}
                  bars={[{ key: 'value', label: 'Utilization %', color: '#10b981' }]}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-500" />
                Department Productivity Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable<DepartmentProductivityEntry>
                data={dept.data ?? []}
                columns={[
                  { key: 'departmentName',      header: 'Department',         sortable: true },
                  { key: 'employeeCount',        header: 'Employees',          sortable: true, align: 'right' },
                  { key: 'totalHours',           header: 'Total Hours',        sortable: true, align: 'right',
                    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
                  { key: 'avgHoursPerEmployee',  header: 'Avg / Employee',     sortable: true, align: 'right',
                    render: (v) => <span className="font-mono">{Number(v).toFixed(1)}</span> },
                  { key: 'utilizationPercent',   header: 'Utilization',        sortable: true, align: 'right',
                    render: (v) => {
                      const pct = Number(v)
                      const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      return (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="font-mono text-xs w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      )
                    } },
                ]}
                searchable
                searchKeys={['departmentName']}
                emptyMessage="No department data available"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Approval Turnaround tab ──────────────────────────────────────────── */}
      {!isLoading && activeTab === 'approval-turnaround' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReportCard
              title="Org Avg Days to Approve"
              value={turnaround.data ? turnaround.data.orgAvgDaysToApprove.toFixed(1) : '—'}
              icon={Timer}
              iconColor={turnaround.data && turnaround.data.orgAvgDaysToApprove <= 1
                ? 'from-emerald-500 to-teal-600'
                : turnaround.data && turnaround.data.orgAvgDaysToApprove <= 3
                ? 'from-amber-500 to-orange-500'
                : 'from-red-500 to-rose-600'}
            />
            <ReportCard
              title="Total Approvals"
              value={turnaround.data?.totalApproved ?? '—'}
              icon={CheckCircle2}
              iconColor="from-blue-500 to-indigo-600"
            />
            <ReportCard
              title="Managers Tracked"
              value={turnaround.data?.entries.length ?? '—'}
              icon={Users}
              iconColor="from-violet-500 to-purple-600"
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Timer className="h-4 w-4 text-blue-500" />
                Avg Days to Approve per Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={(turnaround.data?.entries ?? []).map((e) => ({ name: e.managerName, value: e.avgDaysToApprove }))}
                bars={[{ key: 'value', label: 'Avg Days', color: '#6366f1' }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Timer className="h-4 w-4 text-violet-500" />
                Approval Turnaround Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable<ApprovalTurnaroundEntry>
                data={turnaround.data?.entries ?? []}
                columns={[
                  { key: 'managerName',      header: 'Manager',            sortable: true },
                  { key: 'totalApproved',    header: 'Total Approved',     sortable: true, align: 'right' },
                  { key: 'avgDaysToApprove', header: 'Avg Days',           sortable: true, align: 'right',
                    render: (v) => {
                      const d = Number(v)
                      return (
                        <Badge variant={d <= 1 ? 'success' : d <= 3 ? 'warning' : 'destructive'} className="font-mono">
                          {d.toFixed(1)}d
                        </Badge>
                      )
                    } },
                  { key: 'minDaysToApprove', header: 'Min Days',  align: 'right',
                    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400">{Number(v).toFixed(1)}</span> },
                  { key: 'maxDaysToApprove', header: 'Max Days',  align: 'right',
                    render: (v) => <span className="font-mono text-red-600 dark:text-red-400">{Number(v).toFixed(1)}</span> },
                ]}
                searchable
                searchKeys={['managerName']}
                emptyMessage="No turnaround data available"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Org Compliance tab ───────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'org-compliance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportCard
              title="Overall Compliance"
              value={compliance.data ? `${compliance.data.overallCompliancePercent.toFixed(1)}%` : '—'}
              icon={ShieldCheck}
              iconColor={compliance.data && compliance.data.overallCompliancePercent >= 80
                ? 'from-emerald-500 to-teal-600'
                : 'from-amber-500 to-orange-500'}
            />
            <ReportCard
              title="Total Timesheets"
              value={compliance.data?.totalTimesheets ?? '—'}
              icon={ListChecks}
              iconColor="from-blue-500 to-indigo-600"
            />
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
          </div>

          {/* Overtime by dept bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Overtime Hours by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={(() => {
                  const map = new Map<string, number>()
                  for (const e of overtime.data?.entries ?? []) {
                    map.set(e.department, (map.get(e.department) ?? 0) + e.overtimeHours)
                  }
                  return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
                })()}
                bars={[{ key: 'value', label: 'Overtime Hours (h)', color: '#f59e0b' }]}
              />
            </CardContent>
          </Card>

          {/* Compliance by dept bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Compliance % by Department
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

          {/* Compliance detail table */}
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
                  { key: 'employeeName',     header: 'Employee',   sortable: true },
                  { key: 'department',       header: 'Department', sortable: true },
                  { key: 'totalTimesheets',  header: 'Total',      align: 'right', sortable: true },
                  { key: 'submitted',        header: 'Submitted',  align: 'right' },
                  { key: 'approved',         header: 'Approved',   align: 'right',
                    render: (v) => <span className="text-emerald-600 dark:text-emerald-400 font-medium">{String(v)}</span> },
                  { key: 'rejected',         header: 'Rejected',   align: 'right',
                    render: (v) => <span className="text-red-600 dark:text-red-400">{String(v)}</span> },
                  { key: 'compliancePercent',header: 'Compliance', align: 'right', sortable: true,
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
                emptyMessage="No compliance data available"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
