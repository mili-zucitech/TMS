import { useNavigate } from 'react-router-dom'
import {
  Clock,
  FolderKanban,
  ListChecks,
  CalendarDays,
  Bell,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  CalendarCheck,
  Inbox,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import {
  DashboardCard,
  ChartCard,
  StatCard,
  WelcomeHeader,
  ProgressBar,
  EmptyState,
} from '../components/DashboardComponents'
import { useEmployeeDashboard, getWeekEndDate } from '../hooks/useDashboard'
import { WEEKLY_HOURS_TARGET } from '../types/dashboard.types'
import type { LeaveBalanceResponse, NotificationResponse } from '../types/dashboard.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary' }> = {
  NOT_SUBMITTED: { label: 'Not Submitted', variant: 'destructive' },
  DRAFT: { label: 'Draft', variant: 'warning' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  LOCKED: { label: 'Locked', variant: 'secondary' },
}

function minutesToHours(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Leave balance card component ──────────────────────────────────────────────

function LeaveBalanceCard({ balance }: { balance: LeaveBalanceResponse }) {
  const pct = balance.totalAllocated > 0
    ? Math.round((balance.remainingLeaves / balance.totalAllocated) * 100)
    : 0
  const color =
    pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-2 p-3 rounded-xl bg-muted/40">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{balance.leaveTypeName}</span>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{balance.remainingLeaves}</span>
          /{balance.totalAllocated} days left
        </span>
      </div>
      <ProgressBar value={balance.remainingLeaves} max={balance.totalAllocated} color={color} />
    </div>
  )
}

// ── Notification preview item ─────────────────────────────────────────────────

function NotifItem({ notification }: { notification: NotificationResponse }) {
  return (
    <div className={cn('flex items-start gap-3 py-2.5', !notification.isRead && 'opacity-100')}>
      <div
        className={cn(
          'mt-0.5 h-2 w-2 shrink-0 rounded-full',
          !notification.isRead ? 'bg-primary' : 'bg-muted',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{notification.message}</p>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground/60 mt-0.5">
        {formatRelativeTime(notification.createdAt)}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function EmployeeDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.userId ?? null

  const {
    weekSummary,
    projects,
    tasks,
    leaveBalances,
    pendingLeaves,
    notifications,
    isLoading,
    error,
  } = useEmployeeDashboard(userId)

  const totalHours = weekSummary ? weekSummary.totalMinutes / 60 : 0
  const remainingHours = Math.max(0, WEEKLY_HOURS_TARGET - totalHours)
  const statusConfig = weekSummary ? STATUS_CONFIG[weekSummary.displayStatus] : null

  const activeTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'BLOCKED')
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED')

  // Chart data: tasks by status
  const taskStatusData = [
    { name: 'To Do', count: tasks.filter((t) => t.status === 'TODO').length, fill: '#94a3b8' },
    { name: 'In Progress', count: tasks.filter((t) => t.status === 'IN_PROGRESS').length, fill: '#3b82f6' },
    { name: 'In Review', count: tasks.filter((t) => t.status === 'IN_REVIEW').length, fill: '#f59e0b' },
    { name: 'Completed', count: tasks.filter((t) => t.status === 'COMPLETED').length, fill: '#10b981' },
  ].filter((d) => d.count > 0)

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
      <WelcomeHeader name={user?.email?.split('@')[0] ?? null} role={user?.roleName ?? null} />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Hours This Week"
          value={minutesToHours(weekSummary?.totalMinutes ?? 0)}
          subtitle={`${remainingHours.toFixed(1)}h remaining`}
          icon={Clock}
          iconColor="text-blue-600 dark:text-blue-400 bg-blue-500/10"
          isLoading={isLoading}
        />
        <StatCard
          title="Assigned Projects"
          value={projects.length}
          subtitle={`${projects.filter((p) => p.status === 'ACTIVE').length} active`}
          icon={FolderKanban}
          iconColor="text-violet-600 dark:text-violet-400 bg-violet-500/10"
          isLoading={isLoading}
        />
        <StatCard
          title="My Tasks"
          value={activeTasks.length}
          subtitle={`${completedTasks.length} completed`}
          icon={ListChecks}
          iconColor="text-amber-600 dark:text-amber-400 bg-amber-500/10"
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves.length}
          subtitle={pendingLeaves.length === 0 ? 'No pending' : 'Awaiting approval'}
          icon={CalendarDays}
          iconColor={pendingLeaves.length > 0
            ? 'text-orange-600 dark:text-orange-400 bg-orange-500/10'
            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'}
          isLoading={isLoading}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timesheet Summary — spans 2 cols */}
        <DashboardCard
          title="Weekly Timesheet"
          description={`Week of ${weekSummary?.weekStart ? formatDate(weekSummary.weekStart) : '—'} – ${weekSummary?.weekEnd ? formatDate(getWeekEndDate()) : '—'}`}
          icon={Clock}
          isLoading={isLoading}
          className="lg:col-span-2"
          action={
            <Button size="sm" variant="outline" onClick={() => navigate('/timesheets')}>
              Open Timesheet
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          }
        >
          <div className="space-y-4">
            {/* Status + hours */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight">{minutesToHours(weekSummary?.totalMinutes ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">of {WEEKLY_HOURS_TARGET}h target</p>
              </div>
              {statusConfig && (
                <Badge variant={statusConfig.variant} className="text-xs">
                  {statusConfig.label}
                </Badge>
              )}
            </div>
            {/* Progress bar */}
            <div className="space-y-1.5">
              <ProgressBar
                value={totalHours}
                max={WEEKLY_HOURS_TARGET}
                color={totalHours >= WEEKLY_HOURS_TARGET ? 'bg-emerald-500' : 'bg-primary'}
              />
              <p className="text-xs text-muted-foreground">
                {Math.min(100, Math.round((totalHours / WEEKLY_HOURS_TARGET) * 100))}% completed
              </p>
            </div>
            {/* Pending actions */}
            {weekSummary?.displayStatus === 'NOT_SUBMITTED' || weekSummary?.displayStatus === 'DRAFT' ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Timesheet not submitted
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80">
                    Remember to submit before end of week
                  </p>
                </div>
                <Button
                  size="sm"
                  className="ml-auto text-xs h-7 px-3"
                  onClick={() => navigate('/timesheets')}
                >
                  Submit
                </Button>
              </div>
            ) : weekSummary?.displayStatus === 'APPROVED' ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Timesheet approved ✓
                </p>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        {/* Notifications preview */}
        <DashboardCard
          title="Notifications"
          icon={Bell}
          isLoading={isLoading}
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/notifications')}>
              View all
            </Button>
          }
        >
          {notifications.length === 0 ? (
            <EmptyState icon={Inbox} title="No notifications" description="You're all caught up!" />
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.slice(0, 4).map((n) => (
                <NotifItem key={n.id} notification={n} />
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ── Secondary grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My Projects */}
        <DashboardCard
          title="My Projects"
          icon={FolderKanban}
          isLoading={isLoading}
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/projects')}>
              View all
            </Button>
          }
        >
          {projects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No projects assigned" />
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.clientName ?? p.projectCode}</p>
                  </div>
                  <Badge
                    variant={
                      p.status === 'ACTIVE' ? 'success'
                        : p.status === 'ON_HOLD' ? 'warning'
                        : p.status === 'COMPLETED' ? 'secondary'
                        : 'outline'
                    }
                    className="ml-2 shrink-0 text-[10px]"
                  >
                    {p.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Leave Balances */}
        <DashboardCard
          title="Leave Balance"
          icon={CalendarCheck}
          isLoading={isLoading}
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/leave')}>
              Apply
            </Button>
          }
        >
          {leaveBalances.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave data" description="Contact HR to set up balances" />
          ) : (
            <div className="space-y-2">
              {leaveBalances.map((lb) => (
                <LeaveBalanceCard key={lb.id} balance={lb} />
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Task status chart */}
        <ChartCard
          title="My Tasks"
          description="By status"
          icon={ListChecks}
          isLoading={isLoading}
          height={200}
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/tasks')}>
              View all
            </Button>
          }
        >
          {taskStatusData.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No tasks assigned" description="You have no active tasks" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskStatusData} barSize={28} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {taskStatusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Pending leaves */}
      {pendingLeaves.length > 0 && (
        <DashboardCard
          title="Pending Leave Requests"
          icon={CalendarDays}
          action={
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/leave')}>
              Manage
            </Button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingLeaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20"
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{leave.leaveTypeName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(leave.startDate)} – {formatDate(leave.endDate)} ({leave.totalDays}d)
                  </p>
                  <Badge variant="warning" className="mt-1.5 text-[10px]">Pending</Badge>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  )
}
