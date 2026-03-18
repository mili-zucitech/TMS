import { useMemo, useState } from 'react'
import {
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  BarChart2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportPieChart, ReportLineChart } from '../components/ReportCharts'
import { ExportButtons } from '../components/ExportButtons'
import { useManagerReports } from '../hooks/useReports'
import type { EmployeeHoursEntry, BillableHoursEntry } from '../types/report.types'

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'team-hours',  label: 'Team Hours' },
  { id: 'billable',    label: 'Billable vs Non-Billable' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Team work hours columns ───────────────────────────────────────────────────
const teamHoursCols: Column<EmployeeHoursEntry>[] = [
  { key: 'employeeName',     header: 'Team Member',       sortable: true },
  { key: 'totalHours',       header: 'Total hrs',         sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'billableHours',    header: 'Billable hrs',      sortable: true, align: 'right',
    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'nonBillableHours', header: 'Non-billable hrs',  align: 'right',
    render: (v) => <span className="font-mono text-amber-600 dark:text-amber-400">{Number(v).toFixed(1)}</span> },
  { key: 'weekStartDate',    header: 'Week of',           sortable: true },
]

// ── Billable hours columns ────────────────────────────────────────────────────
const billableCols: Column<BillableHoursEntry>[] = [
  { key: 'employeeName',    header: 'Employee',     sortable: true },
  { key: 'projectName',     header: 'Project',      sortable: true },
  { key: 'totalHours',      header: 'Total hrs',    sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'billableHours',   header: 'Billable',     sortable: true, align: 'right',
    render: (v) => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'nonBillableHours',header: 'Non-billable', align: 'right',
    render: (v) => <span className="font-mono text-amber-600 dark:text-amber-400">{Number(v).toFixed(1)}</span> },
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
export default function ManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { hours, billable, isLoading, error, applyFilters, refresh } = useManagerReports()

  // ── Chart data ────────────────────────────────────────────────────────────
  const hoursPerMemberBar = useMemo(() => {
    if (!hours.data) return []
    // Aggregate per employee (across all weeks)
    const map = new Map<string, number>()
    for (const e of hours.data.entries) {
      map.set(e.employeeName, (map.get(e.employeeName) ?? 0) + e.totalHours)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [hours.data])

  const billablePie = useMemo(() => {
    if (!billable.data) return []
    return [
      { name: 'Billable',     value: billable.data.totalBillableHours },
      { name: 'Non-Billable', value: billable.data.totalNonBillableHours },
    ]
  }, [billable.data])

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

  const submissionStatusPie = useMemo(() => {
    // Derive from billable percent buckets
    if (!billable.data?.entries) return []
    const submitted  = billable.data.entries.filter((e) => e.billablePercent >= 80).length
    const partial    = billable.data.entries.filter((e) => e.billablePercent > 0 && e.billablePercent < 80).length
    const missing    = billable.data.entries.filter((e) => e.billablePercent === 0).length
    return [
      { name: 'On Track',  value: submitted },
      { name: 'Partial',   value: partial },
      { name: 'Missing',   value: missing },
    ].filter((d) => d.value > 0)
  }, [billable.data])

  const utilizationRate = billable.data
    ? Math.round((billable.data.totalBillableHours / (billable.data.totalHours || 1)) * 100)
    : 0

  return (
    <div className="space-y-6 p-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manager Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Team-level productivity, hours, and billable tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButtons
            data={
              activeTab === 'team-hours' ? (hours.data?.entries ?? []) :
              activeTab === 'billable'   ? (billable.data?.entries ?? []) :
              (hours.data?.entries ?? [])
            }
            filename={`manager-report-${activeTab}`}
          />
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <ReportFilters
        filters={{}}
        onApply={applyFilters}
        showEmployee
        showProject
      />

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
          title="Billable Hours"
          value={billable.data ? `${billable.data.totalBillableHours.toFixed(0)}h` : '—'}
          icon={DollarSign}
          iconColor="from-green-500 to-emerald-600"
        />
        <ReportCard
          title="Utilization Rate"
          value={`${utilizationRate}%`}
          icon={TrendingUp}
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

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
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
                <BarChart2 className="h-4 w-4 text-emerald-500" />
                Billable vs Non-Billable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart data={billablePie} />
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
                <CheckCircle2 className="h-4 w-4 text-amber-500" />
                Submission Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportPieChart data={submissionStatusPie} innerRadius={50} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Team Hours tab ─────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'team-hours' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Team Work Hours
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
      )}

      {/* ── Billable tab ───────────────────────────────────────────────────── */}
      {!isLoading && activeTab === 'billable' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Billable vs Non-Billable Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable
              data={billable.data?.entries ?? []}
              columns={billableCols}
              searchable
              searchKeys={['employeeName', 'projectName']}
              emptyMessage="No billable hours data for the selected period"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
