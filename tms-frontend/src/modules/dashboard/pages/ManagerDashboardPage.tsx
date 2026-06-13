import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Clock,
  CalendarDays,
  ClipboardCheck,
  AlertCircle,
  ChevronRight,
  CheckCircle,
  UserCheck,
  FolderKanban,
  SendHorizonal,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

import { useAuth } from '@/context/AuthContext'
import { useGetUserByIdQuery } from '@/features/users/usersApi'
import { useGetTeamTimesheetsQuery, useGetEntriesByTimesheetQuery } from '@/features/timesheets/timesheetsApi'
import { useGetProjectUtilizationReportQuery } from '@/features/reports/reportsApi'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import {
  DashboardCard,
  ChartCard,
  StatCard,
  WelcomeHeader,
  EmptyState,
} from '../components/DashboardComponents'
import { useManagerDashboard } from '../hooks/useDashboard'
import { WEEKLY_HOURS_TARGET } from '../types/dashboard.types'
import type { LeaveRequestResponse, TimesheetResponse, UserResponse } from '../types/dashboard.types'
import type { ProjectUtilizationEntry } from '@/modules/reports/types/report.types'


// ── Helpers ───────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function minutesToHours(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getThisMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

type TimesheetBucket = 'NOT_SUBMITTED' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

// ── Timesheet status row ──────────────────────────────────────────────────────

const TS_STATUS_CONFIG: Record<TimesheetBucket, { label: string; variant: 'destructive' | 'warning' | 'info' | 'success' | 'secondary' }> = {
  NOT_SUBMITTED: { label: 'Not Submitted', variant: 'destructive' },
  DRAFT: { label: 'Draft', variant: 'warning' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
}

interface TimesheetRow {
  user: UserResponse
  timesheet: TimesheetResponse | null
}

function TeamTimesheetRow({ user, timesheet }: TimesheetRow) {
  const status: TimesheetBucket = timesheet ? (timesheet.status as TimesheetBucket) : 'NOT_SUBMITTED'
  const config = TS_STATUS_CONFIG[status] ?? TS_STATUS_CONFIG.NOT_SUBMITTED

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.designation ?? user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground">
        {timesheet?.submittedAt ? formatDate(timesheet.submittedAt) : '—'}
      </td>
    </tr>
  )
}

// ── Team member hours row (self-fetches entries) ─────────────────────────────

interface TeamMemberHoursRowProps {
  user: UserResponse
  timesheet: TimesheetResponse
}

function TeamMemberHoursRow({ user, timesheet }: TeamMemberHoursRowProps) {
  const { data: entries = [], isLoading } = useGetEntriesByTimesheetQuery(timesheet.id)
  const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0)
  const totalHours = totalMinutes / 60
  const isOvertime = totalHours > WEEKLY_HOURS_TARGET
  const isOnTrack = !isOvertime && totalHours >= WEEKLY_HOURS_TARGET
  const pct = Math.min((totalHours / WEEKLY_HOURS_TARGET) * 100, 100)
  const status = timesheet.status as TimesheetBucket
  const config = TS_STATUS_CONFIG[status] ?? TS_STATUS_CONFIG.NOT_SUBMITTED

  if (isLoading) {
    return (
      <tr className="border-b border-border/60">
        <td className="px-4 py-3" colSpan={3}>
          <div className="h-8 rounded bg-muted animate-pulse" />
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.designation ?? user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isOvertime ? 'bg-amber-500' : isOnTrack ? 'bg-emerald-500' : 'bg-rose-500',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn(
            'text-xs font-semibold tabular-nums shrink-0',
            isOvertime ? 'text-amber-600 dark:text-amber-400' : isOnTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500',
          )}>
            {minutesToHours(totalMinutes)}
          </span>
          {isOvertime ? (
            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
          ) : isOnTrack ? (
            <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
          ) : (
            <TrendingDown className="h-3 w-3 text-rose-500 shrink-0" />
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
      </td>
    </tr>
  )
}

// ── Pending leave row ─────────────────────────────────────────────────────────

function PendingLeaveRow({ leave }: { leave: LeaveRequestResponse }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
        {(leave.employeeName ?? 'U').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{leave.employeeName}</p>
        <p className="text-xs text-muted-foreground">
          {leave.leaveTypeName} · {formatDate(leave.startDate)} – {formatDate(leave.endDate)} ({leave.totalDays}d)
        </p>
      </div>
      <Badge variant="warning" className="text-[10px] shrink-0 mt-0.5">Pending</Badge>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ManagerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const managerId = user?.userId ?? null

  const { data: userProfile } = useGetUserByIdQuery(managerId!, { skip: !managerId })
  const displayName = userProfile?.name
    ? userProfile.name.charAt(0).toUpperCase() + userProfile.name.slice(1)
    : null

  const {
    teamMembers,
    teamTimesheets,
    pendingLeaves,
    isLoading,
    error,
  } = useManagerDashboard(managerId)

  const { data: teamTimesheetsData = [] } = useGetTeamTimesheetsQuery(managerId!, { skip: !managerId })
  const currentWeekStart = useMemo(() => getThisMonday(), [])
  const { data: projectUtilReport } = useGetProjectUtilizationReportQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })
  // Backend already scopes to the logged-in manager — use entries directly
  const managerUtilEntries: ProjectUtilizationEntry[] = projectUtilReport?.entries ?? []

  const utilSummaryStats = useMemo(() => {
    const entries = projectUtilReport?.entries ?? []
    return {
      totalProjects: entries.length,
      totalLoggedHours: projectUtilReport?.totalLoggedHours ?? 0,
      avgUtilization: projectUtilReport?.avgUtilizationPercent ?? 0,
    }
  }, [projectUtilReport])

  // Top 3 projects: sort by loggedHours desc (most active first), then by utilizationPercent desc
  const top3Entries = useMemo(
    () =>
      [...managerUtilEntries]
        .sort((a, b) => b.loggedHours - a.loggedHours || b.utilizationPercent - a.utilizationPercent)
        .slice(0, 3),
    [managerUtilEntries],
  )

  const utilChartData = useMemo(
    () =>
      top3Entries.map((e) => ({
        name: e.projectName.length > 13 ? e.projectName.slice(0, 13) + '…' : e.projectName,
        Logged: parseFloat(e.loggedHours.toFixed(1)),
        Allocated: parseFloat(e.allocatedHours.toFixed(1)),
      })),
    [top3Entries],
  )

  const currentWeekRows = useMemo(
    () =>
      teamTimesheetsData
        .filter((ts): ts is TimesheetResponse => ts !== null && ts.weekStartDate === currentWeekStart)
        .map((ts) => {
          const user = teamMembers.find((m) => m.id === ts.userId)
          return user ? { user, timesheet: ts } : null
        })
        .filter((r): r is { user: UserResponse; timesheet: TimesheetResponse } => r !== null),
    [teamTimesheetsData, currentWeekStart, teamMembers],
  )

  const overtimeRows = useMemo(
    () =>
      currentWeekRows
        .filter((r) => r.timesheet && (r.timesheet.totalMinutes ?? 0) > WEEKLY_HOURS_TARGET * 60)
        .sort((a, b) => {
          const aMinutes = a.timesheet?.totalMinutes ?? 0
          const bMinutes = b.timesheet?.totalMinutes ?? 0
          return bMinutes - aMinutes
        }),
    [currentWeekRows],
  )

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const activeMembers = teamMembers.filter((u) => u.status === 'ACTIVE')
  const onLeaveToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return new Set(
      pendingLeaves
        .filter((l) => l.status === 'APPROVED' && l.startDate <= today && l.endDate >= today)
        .map((l) => l.userId),
    ).size
  }, [pendingLeaves])

  // Timesheet status distribution for pie chart
  const tsDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      'Not Submitted': 0,
      Draft: 0,
      Submitted: 0,
      Approved: 0,
      Rejected: 0,
    }
    teamTimesheets.forEach(({ timesheet }) => {
      if (!timesheet || timesheet.status === 'DRAFT') {
        const key = !timesheet ? 'Not Submitted' : 'Draft'
        buckets[key]++
      } else if (timesheet.status === 'SUBMITTED') buckets['Submitted']++
      else if (timesheet.status === 'APPROVED') buckets['Approved']++
      else if (timesheet.status === 'REJECTED') buckets['Rejected']++
    })
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [teamTimesheets])

  const pendingTimesheets = teamTimesheets.filter(
    ({ timesheet }) => !timesheet || timesheet.status === 'DRAFT',
  )

  if (error) {
    return (
      <div className="p-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 m-6">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-screen-xl mx-auto">
      {/* Welcome */}
      <WelcomeHeader name={displayName} role={user?.roleName ?? null} />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Team Members"
          value={teamMembers.length}
          subtitle={`${activeMembers.length} active`}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400 bg-blue-500/10"
          isLoading={isLoading}
        />
        <StatCard
          title="On Leave Today"
          value={onLeaveToday}
          subtitle={onLeaveToday === 0 ? 'Full team in' : 'employees absent'}
          icon={CalendarDays}
          iconColor={onLeaveToday > 0
            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Timesheets"
          value={pendingTimesheets.length}
          subtitle={pendingTimesheets.length === 0 ? 'All submitted' : 'Need submission'}
          icon={ClipboardCheck}
          iconColor={pendingTimesheets.length > 0
            ? 'text-red-500 bg-red-500/10'
            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'}
          isLoading={isLoading}
        />
        <StatCard
          title="Leave Requests"
          value={pendingLeaves.length}
          subtitle={pendingLeaves.length === 0 ? 'None pending' : 'Awaiting review'}
          icon={CalendarDays}
          iconColor={pendingLeaves.length > 0
            ? 'text-orange-600 dark:text-orange-400 bg-orange-500/10'
            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'}
          isLoading={isLoading}
        />
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/timesheets/reminders')} className="gap-2">
          <SendHorizonal className="h-4 w-4" />
          Send Reminders
        </Button>
        <Button variant="outline" onClick={() => navigate('/leave/approvals')} className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Review Leaves
          {pendingLeaves.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {pendingLeaves.length}
            </span>
          )}
        </Button>
        <Button variant="outline" onClick={() => navigate('/timesheets/manager')} className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Review Timesheets
        </Button>
      </div>

      {/* ── Overtime This Week ── */}
      <DashboardCard
        title="Overtime This Week"
        description={`Members exceeding the ${WEEKLY_HOURS_TARGET}h target`}
        icon={Zap}
        isLoading={isLoading}
        bodyClassName="p-0"
      >
        {currentWeekRows.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={Clock} title="No timesheets this week" description="No team timesheets found for the current week" />
          </div>
        ) : overtimeRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium">No overtime this week</p>
              <p className="text-xs text-muted-foreground mt-0.5">All team members are within the {WEEKLY_HOURS_TARGET}h target</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Hours logged</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {overtimeRows.map(({ user: u, timesheet: ts }) => (
                  <TeamMemberHoursRow key={u.id} user={u} timesheet={ts} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Timesheet status pie */}
        <ChartCard
          title="Team Timesheet Status"
          description="Current week"
          icon={Clock}
          isLoading={isLoading}
          height={160}
        >
          {teamTimesheets.length === 0 ? (
            <EmptyState icon={Users} title="No team members" description="No direct reports found" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={tsDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {tsDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                  }}
                />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Team members active vs on-leave */}
        <ChartCard
          title="Team Availability"
          description="Active vs On Leave"
          icon={UserCheck}
          isLoading={isLoading}
          height={160}
        >
          {teamMembers.length === 0 ? (
            <EmptyState icon={Users} title="No team data" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={[
                  { name: 'Active', count: activeMembers.length, fill: '#10b981' },
                  { name: 'On Leave', count: onLeaveToday, fill: '#f59e0b' },
                  { name: 'Inactive', count: teamMembers.length - activeMembers.length, fill: '#94a3b8' },
                ]}
                barSize={36}
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {[{ fill: '#10b981' }, { fill: '#f59e0b' }, { fill: '#94a3b8' }].map((c, i) => (
                    <Cell key={i} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Team timesheet table + pending leaves ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team timesheets */}
        <DashboardCard
          title="Team Timesheet Status"
          description="This week"
          icon={ClipboardCheck}
          isLoading={isLoading}
          bodyClassName="p-0"
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/timesheets/manager')}>
              View all
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          }
        >
          {teamTimesheets.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Users} title="No direct reports" description="No employees report to you" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {teamTimesheets.slice(0, 8).map(({ user: u, timesheet }) => (
                    <TeamTimesheetRow key={u.id} user={u} timesheet={timesheet} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        {/* Pending leave requests */}
        <DashboardCard
          title="Pending Leave Requests"
          icon={CalendarDays}
          isLoading={isLoading}
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/leave/approvals')}>
              Review all
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          }
        >
          {pendingLeaves.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No pending requests" description="All leave requests resolved" />
          ) : (
            <div>
              {pendingLeaves.slice(0, 6).map((leave) => (
                <PendingLeaveRow key={leave.id} leave={leave} />
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ── Projects overview ── */}
      <DashboardCard
        title="Project Utilization"
        icon={FolderKanban}
        isLoading={isLoading}
        action={
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/projects')}>
            View all
          </Button>
        }
      >
        {managerUtilEntries.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects found" description="No projects are assigned to you as project manager" />
        ) : (
          <div className="space-y-6">

            {/* ── Summary strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums leading-none">{utilSummaryStats.totalProjects}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Projects</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums leading-none">{utilSummaryStats.totalLoggedHours.toFixed(0)}h</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Hours Logged</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  utilSummaryStats.avgUtilization >= 100 ? 'bg-red-500/10' :
                  utilSummaryStats.avgUtilization >= 80  ? 'bg-amber-500/10' : 'bg-emerald-500/10',
                )}>
                  <TrendingUp className={cn('h-4 w-4',
                    utilSummaryStats.avgUtilization >= 100 ? 'text-red-500' :
                    utilSummaryStats.avgUtilization >= 80  ? 'text-amber-500' : 'text-emerald-500',
                  )} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-lg font-bold tabular-nums leading-none',
                    utilSummaryStats.avgUtilization >= 100 ? 'text-red-500' :
                    utilSummaryStats.avgUtilization >= 80  ? 'text-amber-500' : 'text-emerald-500',
                  )}>{utilSummaryStats.avgUtilization.toFixed(0)}%</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Avg Utilization</p>
                </div>
              </div>
            </div>

            {/* ── Charts row ── */}
            <ChartCard
              title="Hours Overview"
              description="Logged vs allocated hours per project"
              height={230}
            >
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={utilChartData}
                  margin={{ top: 4, right: 8, left: -12, bottom: 52 }}
                  barGap={3}
                  barSize={13}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} unit="h" />
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                    formatter={(v: number) => [`${v}h`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="Logged" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Allocated" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ── Per-project progress cards ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Top projects by activity
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {top3Entries.map((entry) => {
                  const utilPct  = Math.min(entry.utilizationPercent ?? 0, 100)
                  const utilBar  = utilPct >= 100 ? 'bg-red-500' : utilPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  const utilText = utilPct >= 100 ? 'text-red-500' : utilPct >= 80 ? 'text-amber-500' : 'text-emerald-500'
                  return (
                    <div
                      key={entry.projectId}
                      className="rounded-xl border border-border/60 bg-card p-4 space-y-3 hover:bg-muted/20 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{entry.projectName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {entry.activeEmployees} member{entry.activeEmployees !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className={cn('text-sm font-bold tabular-nums shrink-0 mt-0.5', utilText)}>
                          {(entry.utilizationPercent ?? 0).toFixed(0)}%
                        </span>
                      </div>

                      {/* Utilization bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Utilization</span>
                          <span>{entry.loggedHours.toFixed(0)}h / {entry.allocatedHours.toFixed(0)}h</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', utilBar)}
                            style={{ width: `${utilPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </DashboardCard>
    </div>
  )
}
