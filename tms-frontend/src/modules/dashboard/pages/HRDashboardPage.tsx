import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Building2,
  FolderKanban,
  UserCheck,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Activity,
  BarChart2,
  Clock,
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
  LineChart,
  Line,
} from 'recharts'

import { useAuth } from '@/context/AuthContext'
import { useGetUserByIdQuery } from '@/features/users/usersApi'
import { useGetProjectUtilizationReportQuery } from '@/features/reports/reportsApi'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DashboardCard,
  ChartCard,
  StatCard,
  WelcomeHeader,
  EmptyState,
} from '../components/DashboardComponents'
import { useHRDashboard } from '../hooks/useDashboard'
import type { AuditLogResponse } from '../types/dashboard.types'
import { cn } from '@/utils/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316']

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const AUDIT_ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Created', color: 'text-emerald-600 dark:text-emerald-400' },
  UPDATE: { label: 'Updated', color: 'text-blue-600 dark:text-blue-400' },
  DELETE: { label: 'Deleted', color: 'text-red-500' },
  SUBMIT: { label: 'Submitted', color: 'text-violet-600 dark:text-violet-400' },
  APPROVE: { label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400' },
  REJECT: { label: 'Rejected', color: 'text-red-500' },
  LOGIN: { label: 'Logged in', color: 'text-blue-600 dark:text-blue-400' },
  LOGOUT: { label: 'Logged out', color: 'text-muted-foreground' },
}

// ── Activity feed item ────────────────────────────────────────────────────────

function ActivityItem({ log }: { log: AuditLogResponse }) {
  const config = AUDIT_ACTION_CONFIG[log.action] ?? { label: log.action, color: 'text-muted-foreground' }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className={`font-medium ${config.color}`}>{config.label}</span>
          {' '}
          <span className="text-muted-foreground">
            {log.entityType?.toLowerCase() ?? ''} {log.description ? `— ${log.description}` : ''}
          </span>
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{formatRelativeTime(log.createdAt)}</p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HRDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.userId ?? null

  const { data: userProfile } = useGetUserByIdQuery(userId!, { skip: !userId })
  const displayName = userProfile?.name
    ? userProfile.name.charAt(0).toUpperCase() + userProfile.name.slice(1)
    : null

  const {
    allUsers,
    departments,
    allProjects,
    recentAuditLogs,
    isLoading,
    error,
  } = useHRDashboard()

  // ── Derived data ──────────────────────────────────────────────────────────────

  const activeUsers = allUsers.filter((u) => u.status === 'ACTIVE')
  const inactiveUsers = allUsers.filter((u) => u.status === 'INACTIVE')

  const activeProjects = allProjects.filter((p) => p.status === 'ACTIVE')
  const completedProjects = allProjects.filter((p) => p.status === 'COMPLETED')

  const { data: projectUtilReport } = useGetProjectUtilizationReportQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })

  // Project utilization: top projects sorted by loggedHours for bar chart, and map for cards
  const projectUtilBar = useMemo(() => {
    if (!projectUtilReport?.entries?.length) return []
    return [...projectUtilReport.entries]
      .sort((a, b) => b.loggedHours - a.loggedHours)
      .slice(0, 8)
      .map((e) => ({ name: e.projectName, utilization: e.utilizationPercent ?? 0, logged: e.loggedHours }))
  }, [projectUtilReport])

  // Employees per department
  const deptDistribution = useMemo(() => {
    const map = new Map<string, number>()
    allUsers.forEach((u) => {
      if (!u.departmentId) return
      const dept = departments.find((d) => d.id === u.departmentId)
      const name = dept?.name ?? `Dept ${u.departmentId}`
      map.set(name, (map.get(name) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [allUsers, departments])

  // Role distribution
  const roleDistribution = useMemo(() => {
    const roles: Record<string, number> = {}
    allUsers.forEach((u) => {
      roles[u.roleName] = (roles[u.roleName] ?? 0) + 1
    })
    return Object.entries(roles).map(([name, value]) => ({ name, value }))
  }, [allUsers])

  // Headcount trend (simulated from joiningDate — users joined per month last 6 months)
  const headcountTrend = useMemo(() => {
    const months: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      months[key] = 0
    }
    allUsers.forEach((u) => {
      const d = new Date(u.joiningDate)
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      if (key in months) months[key]++
    })
    return Object.entries(months).map(([month, newHires]) => ({ month, newHires }))
  }, [allUsers])

  const utilSummaryStats = useMemo(() => {
    const entries = projectUtilReport?.entries ?? []
    const totalLogged = projectUtilReport?.totalLoggedHours ?? 0
    const totalBillable = entries.reduce((sum, e) => sum + (e.billableHours ?? 0), 0)
    const billableRatio = totalLogged > 0 ? (totalBillable / totalLogged) * 100 : 0
    return {
      totalProjects: entries.length,
      totalLoggedHours: totalLogged,
      avgUtilization: projectUtilReport?.avgUtilizationPercent ?? 0,
      billableRatio,
    }
  }, [projectUtilReport])

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
          title="Total Employees"
          value={allUsers.length}
          subtitle={`${activeUsers.length} active · ${inactiveUsers.length} inactive`}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400 bg-blue-500/10"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Employees"
          value={activeUsers.length}
          subtitle={`${Math.round((activeUsers.length / Math.max(1, allUsers.length)) * 100)}% of total`}
          icon={UserCheck}
          iconColor="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          isLoading={isLoading}
        />
        <StatCard
          title="Departments"
          value={departments.length}
          subtitle="Active org units"
          icon={Building2}
          iconColor="text-violet-600 dark:text-violet-400 bg-violet-500/10"
          isLoading={isLoading}
        />
        <StatCard
          title="Projects"
          value={allProjects.length}
          subtitle={`${activeProjects.length} active · ${completedProjects.length} completed`}
          icon={FolderKanban}
          iconColor="text-amber-600 dark:text-amber-400 bg-amber-500/10"
          isLoading={isLoading}
        />
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Employees per department */}
        <ChartCard
          title="Employee Distribution"
          description="By department"
          icon={Building2}
          isLoading={isLoading}
          height={260}
        >
          {deptDistribution.length === 0 ? (
            <EmptyState icon={Building2} title="No department data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={deptDistribution}
                layout="vertical"
                barSize={16}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
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
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Project utilization bar chart */}
        <ChartCard
          title="Project Utilization"
          description="Hours logged vs estimated (top 8)"
          icon={FolderKanban}
          isLoading={isLoading}
          height={260}
        >
          {projectUtilBar.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No utilization data" description="Add estimated hours to tasks for utilization tracking" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={projectUtilBar}
                layout="vertical"
                barSize={14}
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  domain={[0, 'dataMax']}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}h`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                  }}
                  formatter={(value: number, name: string) =>
                    name === 'logged' ? [`${value.toFixed(1)}h`, 'Hours Logged'] : [`${value.toFixed(0)}%`, 'Utilization']
                  }
                />
                <Bar dataKey="logged" radius={[0, 4, 4, 0]}>
                  {projectUtilBar.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.utilization > 100 ? '#ef4444' : entry.utilization >= 80 ? '#f59e0b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* New hires trend (line chart) */}
        <ChartCard
          title="New Hires / Month"
          description="Last 6 months"
          icon={TrendingUp}
          isLoading={isLoading}
          height={220}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={headcountTrend} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
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
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--card-foreground)',
                }}
              />
              <Line
                type="monotone"
                dataKey="newHires"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Role distribution */}
        <ChartCard
          title="Role Distribution"
          description="Workforce composition"
          icon={BarChart2}
          isLoading={isLoading}
          height={220}
        >
          {roleDistribution.length === 0 ? (
            <EmptyState icon={Users} title="No user data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {roleDistribution.map((_, idx) => (
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
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Bottom row: Departments table + Recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Departments */}
        <DashboardCard
          title="Departments"
          icon={Building2}
          isLoading={isLoading}
          bodyClassName="p-0"
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/organization')}>
              Manage
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          }
        >
          {departments.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Building2} title="No departments" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Department</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Members</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {departments.slice(0, 8).map((dept) => {
                    const count = allUsers.filter((u) => u.departmentId === dept.id).length
                    return (
                      <tr key={dept.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{dept.name}</p>
                          {dept.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{dept.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{count}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={dept.status === 'ACTIVE' ? 'success' : 'secondary'}
                            className="text-[10px]"
                          >
                            {dept.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        {/* Recent activity */}
        <DashboardCard
          title="Recent Activity"
          description="Latest audit logs"
          icon={Activity}
          isLoading={isLoading}
        >
          {recentAuditLogs.length === 0 ? (
            <EmptyState icon={Activity} title="No recent activity" description="Audit logs will appear here" />
          ) : (
            <div>
              {recentAuditLogs.slice(0, 8).map((log) => (
                <ActivityItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ── Project utilization progress bars ── */}
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
        {!projectUtilReport?.entries?.length ? (
          <EmptyState icon={FolderKanban} title="No active projects" />
        ) : (
          <div className="space-y-4">
            {/* ── Aggregate summary cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                  <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums leading-none">{utilSummaryStats.totalProjects}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Total Projects</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                  <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums leading-none">{utilSummaryStats.totalLoggedHours.toFixed(0)}h</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Hours Logged</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  utilSummaryStats.avgUtilization >= 100 ? 'bg-red-500/10' :
                  utilSummaryStats.avgUtilization >= 80  ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                )}>
                  <TrendingUp className={cn('h-4 w-4',
                    utilSummaryStats.avgUtilization >= 100 ? 'text-red-500' :
                    utilSummaryStats.avgUtilization >= 80  ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  )} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-lg font-bold tabular-nums leading-none',
                    utilSummaryStats.avgUtilization >= 100 ? 'text-red-500' :
                    utilSummaryStats.avgUtilization >= 80  ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  )}>{utilSummaryStats.avgUtilization.toFixed(0)}%</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Avg Utilization</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-500/10">
                  <UserCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums leading-none">{utilSummaryStats.billableRatio.toFixed(0)}%</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Billable Ratio</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...projectUtilReport.entries]
              .sort((a, b) => (b.utilizationPercent ?? 0) - (a.utilizationPercent ?? 0))
              .slice(0, 8)
              .map((entry) => {
                const pct = Math.min(entry.utilizationPercent ?? 0, 100)
                const barColor = pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                const textColor = pct > 100 ? 'text-red-500' : pct >= 80 ? 'text-amber-500' : 'text-emerald-500'
                return (
                  <div key={entry.projectId} className="space-y-1.5 p-3 rounded-lg border border-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{entry.projectName}</span>
                      <span className={cn(`text-xs font-semibold tabular-nums shrink-0`, textColor)}>
                        {(entry.utilizationPercent ?? 0).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.activeEmployees} member{entry.activeEmployees !== 1 ? 's' : ''} · {entry.loggedHours.toFixed(0)}h logged
                    </p>
                  </div>
                )
              })}
          </div>
          </div>
        )}
      </DashboardCard>
    </div>
  )
}
