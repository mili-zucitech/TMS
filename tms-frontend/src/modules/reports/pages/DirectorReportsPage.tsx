import { useMemo, useState } from 'react'
import {
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  FolderKanban,
  RefreshCw,
  Briefcase,
  BarChart2,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportPieChart, ReportLineChart } from '../components/ReportCharts'
import { ExportButtons } from '../components/ExportButtons'
import { useDirectorReports } from '../hooks/useReports'
import type { ProjectUtilizationEntry, BillableHoursEntry } from '../types/report.types'

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'executive',   label: 'Executive Summary' },
  { id: 'projects',    label: 'Project Utilization' },
  { id: 'workforce',   label: 'Workforce Trends' },
  { id: 'cost',        label: 'Cost Analysis' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Project utilization columns ───────────────────────────────────────────────
const projectCols: Column<ProjectUtilizationEntry>[] = [
  { key: 'projectName',         header: 'Project',           sortable: true },
  { key: 'activeEmployees',     header: 'Active Employees',  sortable: true, align: 'right' },
  { key: 'allocatedHours',      header: 'Allocated hrs',     sortable: true, align: 'right',
    render: (v) => <span className="font-mono">{Number(v).toFixed(0)}</span> },
  { key: 'loggedHours',         header: 'Logged hrs',        sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(0)}</span> },
  { key: 'billableHours',       header: 'Billable hrs',      sortable: true, align: 'right',
    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{Number(v).toFixed(0)}</span> },
  { key: 'utilizationPercent',  header: 'Utilization',       sortable: true, align: 'right',
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

// ── Cost analysis columns ─────────────────────────────────────────────────────
const costCols: Column<BillableHoursEntry>[] = [
  { key: 'employeeName',    header: 'Employee',        sortable: true },
  { key: 'department',      header: 'Department',      sortable: true },
  { key: 'projectName',     header: 'Project',         sortable: true },
  { key: 'totalHours',      header: 'Total hrs',       sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'billableHours',   header: 'Billable',        sortable: true, align: 'right',
    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'nonBillableHours',header: 'Non-billable',    align: 'right',
    render: (v) => <span className="font-mono text-red-500">{Number(v).toFixed(1)}</span> },
  { key: 'billablePercent', header: 'Efficiency %',    sortable: true, align: 'right',
    render: (v) => (
      <span className={`font-mono text-xs font-semibold ${Number(v) >= 80 ? 'text-emerald-600' : Number(v) >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
        {Number(v)}%
      </span>
    ) },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DirectorReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('executive')
  const { hours, projects, billable, kpi, isLoading, error, applyFilters, refresh } = useDirectorReports()

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

  const billablePie = useMemo(() => {
    if (!billable.data) return []
    return [
      { name: 'Billable',     value: billable.data.totalBillableHours },
      { name: 'Non-Billable', value: billable.data.totalNonBillableHours },
    ]
  }, [billable.data])

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

  return (
    <div className="space-y-6 p-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organization-wide insights, KPIs, and strategic analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButtons
            data={
              activeTab === 'projects'  ? (projects.data?.entries ?? []) :
              activeTab === 'cost'      ? (billable.data?.entries ?? []) :
              (hours.data?.entries ?? [])
            }
            filename={`director-report-${activeTab}`}
          />
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReportCard
          title="Total Hours Logged"
          value={kpi.data ? `${kpi.data.totalHoursLogged.toLocaleString()}h` : '—'}
          subtitle="Org-wide"
          icon={Clock}
          iconColor="from-blue-500 to-blue-600"
        />
        <ReportCard
          title="Billable Hours"
          value={kpi.data ? `${kpi.data.totalBillableHours.toLocaleString()}h` : '—'}
          subtitle="Revenue generating"
          icon={DollarSign}
          iconColor="from-emerald-500 to-teal-600"
        />
        <ReportCard
          title="Utilization Rate"
          value={kpi.data ? `${kpi.data.utilizationPercent}%` : '—'}
          subtitle="Billable / total hours"
          icon={TrendingUp}
          iconColor="from-violet-500 to-purple-600"
        />
        <ReportCard
          title="Active Employees"
          value={kpi.data?.activeEmployees ?? '—'}
          subtitle="Logged hours"
          icon={Users}
          iconColor="from-amber-500 to-orange-500"
        />
      </div>

      {/* Second KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ReportCard
          title="Active Projects"
          value={kpi.data?.activeProjects ?? '—'}
          icon={FolderKanban}
          iconColor="from-sky-500 to-cyan-600"
        />
        <ReportCard
          title="Avg Utilization"
          value={projects.data ? `${Math.round(projects.data.avgUtilizationPercent)}%` : '—'}
          subtitle="Across all projects"
          icon={BarChart2}
          iconColor="from-rose-500 to-pink-600"
        />
        <ReportCard
          title="Total Projects"
          value={projects.data?.entries.length ?? '—'}
          icon={Briefcase}
          iconColor="from-indigo-500 to-violet-600"
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
        <div className="grid gap-6 md:grid-cols-2">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Billable vs Non-Billable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart data={billablePie} />
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
        <div className="grid gap-6 md:grid-cols-2">
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
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Billable Split
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart data={billablePie} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Cost Analysis tab ────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'cost' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              Cost vs Billable Hours — Employee Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable
              data={billable.data?.entries ?? []}
              columns={costCols}
              searchable
              searchKeys={['employeeName', 'department', 'projectName']}
              emptyMessage="No cost analysis data for the selected period"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
