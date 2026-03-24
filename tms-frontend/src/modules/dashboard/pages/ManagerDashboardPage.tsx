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
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DashboardCard,
  ChartCard,
  StatCard,
  WelcomeHeader,
  EmptyState,
} from '../components/DashboardComponents'
import { useManagerDashboard } from '../hooks/useDashboard'
import type { LeaveRequestResponse, TimesheetResponse, UserResponse } from '../types/dashboard.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
    allProjects,
    isLoading,
    error,
  } = useManagerDashboard(managerId)

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

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Timesheet status pie */}
        <ChartCard
          title="Team Timesheet Status"
          description="Current week"
          icon={Clock}
          isLoading={isLoading}
          height={260}
        >
          {teamTimesheets.length === 0 ? (
            <EmptyState icon={Users} title="No team members" description="No direct reports found" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={tsDistribution}
                  cx="55%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                  labelLine={false}
                >
                  {tsDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
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
          height={260}
        >
          {teamMembers.length === 0 ? (
            <EmptyState icon={Users} title="No team data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[
                  { name: 'Active', count: activeMembers.length, fill: '#10b981' },
                  { name: 'On Leave', count: onLeaveToday, fill: '#f59e0b' },
                  { name: 'Inactive', count: teamMembers.length - activeMembers.length, fill: '#94a3b8' },
                ]}
                barSize={48}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
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
        title="Project Overview"
        icon={FolderKanban}
        isLoading={isLoading}
        action={
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/projects')}>
            View all
          </Button>
        }
      >
        {allProjects.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects found" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...allProjects]
              .sort((a, b) => {
                const order: Record<string, number> = { ACTIVE: 0, ON_HOLD: 1, PLANNED: 2, COMPLETED: 3, CANCELLED: 4 }
                return (order[a.status] ?? 5) - (order[b.status] ?? 5)
              })
              .slice(0, 6)
              .map((p) => {
                const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' | 'destructive' }> = {
                  ACTIVE:    { label: 'Active',    variant: 'success' },
                  PLANNED:   { label: 'Planned',   variant: 'info' },
                  ON_HOLD:   { label: 'On Hold',   variant: 'warning' },
                  COMPLETED: { label: 'Completed', variant: 'secondary' },
                  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
                }
                const cfg = statusConfig[p.status] ?? { label: p.status, variant: 'secondary' as const }
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <Badge variant={cfg.variant} className="text-[10px] shrink-0">{cfg.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.clientName ?? p.projectCode}</p>
                  </div>
                )
              })}
          </div>
        )}
      </DashboardCard>
    </div>
  )
}
