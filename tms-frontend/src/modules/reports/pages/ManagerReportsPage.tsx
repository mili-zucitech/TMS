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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ReportCard } from '../components/ReportCard'
import { ReportFilters } from '../components/ReportFilters'
import { ReportTable, statusBadge, type Column } from '../components/ReportTable'
import { ReportBarChart, ReportLineChart, ReportPieChart } from '../components/ReportCharts'
import { TrendInsights } from '../components/TrendInsights'
import { ExportButtons } from '../components/ExportButtons'
import { useManagerReports, useLeaveReport } from '../hooks/useReports'
import type { EmployeeHoursEntry, LeaveReportEntry } from '../types/report.types'

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'team-hours', label: 'Team Hours' },
  { id: 'leave',      label: 'Leave' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Team work hours columns ───────────────────────────────────────────────────
const teamHoursCols: Column<EmployeeHoursEntry>[] = [
  { key: 'employeeName',  header: 'Team Member', sortable: true },
  { key: 'totalHours',    header: 'Total hrs',   sortable: true, align: 'right',
    render: (v) => <span className="font-mono font-medium">{Number(v).toFixed(1)}</span> },
  { key: 'weekStartDate', header: 'Week of',     sortable: true },
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
  const { hours, isLoading: hoursLoading, error: hoursError, applyFilters: applyHoursFilters, refresh: refreshHours } = useManagerReports()
  const leave = useLeaveReport()

  const isLoading = hoursLoading || leave.isLoading
  const error = hoursError ?? leave.error ?? null

  const applyFilters = (f: Parameters<typeof applyHoursFilters>[0]) => {
    applyHoursFilters(f)
    leave.applyFilters(f)
  }

  const refresh = () => {
    refreshHours()
    leave.refresh()
  }

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

  const exportData = useMemo(() => {
    if (activeTab === 'leave') return leave.data?.entries ?? []
    return hours.data?.entries ?? []
  }, [activeTab, hours.data, leave.data])

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
          <ExportButtons data={exportData} filename={`manager-report-${activeTab}`} />
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
    </div>
  )
}

