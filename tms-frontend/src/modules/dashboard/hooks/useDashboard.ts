import { useMemo } from 'react'
import {
  useGetUsersQuery,
} from '@/features/users/usersApi'
import {
  useGetTimesheetsByUserQuery,
  useGetEntriesByTimesheetQuery,
} from '@/features/timesheets/timesheetsApi'
import {
  useGetProjectsQuery,
  useGetAssignmentsByUserQuery,
} from '@/features/projects/projectsApi'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import {
  useGetLeavesByUserQuery,
  useGetLeaveBalanceQuery,
  useGetTeamLeavesByManagerQuery,
} from '@/features/leave/leaveApi'
import { useGetUserNotificationsQuery } from '@/features/notifications/notificationsApi'
import { useGetDepartmentsQuery } from '@/features/departments/departmentsApi'
import { getWeekStart, getWeekEnd, toDateString } from '@/modules/timesheets/utils/timesheetHelpers'
import type {
  AuditLogResponse,
  DepartmentResponse,
  LeaveBalanceResponse,
  LeaveRequestResponse,
  NotificationResponse,
  ProjectAssignmentResponse,
  ProjectResponse,
  TaskResponse,
  TimeEntryResponse,
  TimesheetResponse,
  UserResponse,
  WeeklyTimesheetSummary,
} from '../types/dashboard.types'

// ── Week helpers (re-exported for backwards compatibility) ────────────────────
export function getWeekStartDate(): string {
  return toDateString(getWeekStart(new Date()))
}

export function getWeekEndDate(): string {
  return toDateString(getWeekEnd(getWeekStart(new Date())))
}

// ── useEmployeeDashboard ──────────────────────────────────────────────────────

interface EmployeeDashboardData {
  weekSummary: WeeklyTimesheetSummary | null
  timeEntries: TimeEntryResponse[]
  projectAssignments: ProjectAssignmentResponse[]
  projects: ProjectResponse[]
  tasks: TaskResponse[]
  leaveBalances: LeaveBalanceResponse[]
  pendingLeaves: LeaveRequestResponse[]
  notifications: NotificationResponse[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useEmployeeDashboard(userId: string | null): EmployeeDashboardData {
  const weekStart = getWeekStartDate()
  const weekEnd   = getWeekEndDate()

  const { data: timesheets = [], isLoading: l1 } = useGetTimesheetsByUserQuery(userId!, { skip: !userId })
  const { data: assignmentsRaw = [], isLoading: l2 } = useGetAssignmentsByUserQuery(userId!, { skip: !userId })
  const { data: allProjectsPage, isLoading: l3 } = useGetProjectsQuery()
  const { data: tasksPage, isLoading: l4 } = useGetTasksQuery()
  const { data: leaveBalances = [], isLoading: l5 } = useGetLeaveBalanceQuery(userId!, { skip: !userId })
  const { data: leavesRaw = [], isLoading: l6 } = useGetLeavesByUserQuery(userId!, { skip: !userId })
  const { data: notifications = [], isLoading: l7 } = useGetUserNotificationsQuery(userId!, { skip: !userId })

  const currentWeekTS = timesheets.find((t) => t.weekStartDate === weekStart) ?? null

  const { data: timeEntries = [], isLoading: l8 } = useGetEntriesByTimesheetQuery(
    currentWeekTS?.id ?? 0,
    { skip: !currentWeekTS },
  )

  const allProjects: ProjectResponse[] = (allProjectsPage?.content ?? []) as unknown as ProjectResponse[]
  const tasks: TaskResponse[] = (tasksPage?.content ?? []) as unknown as TaskResponse[]

  const assignedProjectIds = useMemo(
    () => new Set(assignmentsRaw.map((a) => a.projectId)),
    [assignmentsRaw],
  )
  const projects = useMemo(
    () => allProjects.filter((p) => assignedProjectIds.has(p.id)),
    [allProjects, assignedProjectIds],
  )

  const pendingLeaves = useMemo(() => leavesRaw.filter((l) => l.status === 'PENDING'), [leavesRaw])

  const totalMinutes = useMemo(
    () => timeEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [timeEntries],
  )

  const weekSummary: WeeklyTimesheetSummary = useMemo(
    () => ({
      timesheet: currentWeekTS,
      totalMinutes,
      displayStatus: currentWeekTS ? currentWeekTS.status : 'NOT_SUBMITTED',
      weekStart,
      weekEnd,
    }),
    [currentWeekTS, totalMinutes, weekStart, weekEnd],
  )

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8

  return {
    weekSummary,
    timeEntries: timeEntries as unknown as TimeEntryResponse[],
    projectAssignments: assignmentsRaw as unknown as ProjectAssignmentResponse[],
    projects,
    tasks,
    leaveBalances,
    pendingLeaves: pendingLeaves as unknown as LeaveRequestResponse[],
    notifications,
    isLoading,
    error: null,
    refresh: () => undefined,
  }
}

// ── useManagerDashboard ───────────────────────────────────────────────────────

interface ManagerDashboardData {
  teamMembers: UserResponse[]
  teamTimesheets: { user: UserResponse; timesheet: TimesheetResponse | null }[]
  pendingLeaves: LeaveRequestResponse[]
  notifications: NotificationResponse[]
  allProjects: ProjectResponse[]
  allUsers: UserResponse[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useManagerDashboard(managerId: string | null): ManagerDashboardData {
  const { data: allUsersPage, isLoading: l1 } = useGetUsersQuery({ size: 200 })
  const allUsers: UserResponse[] = (allUsersPage?.content ?? []) as unknown as UserResponse[]
  const directReports = useMemo(
    () => allUsers.filter((u) => u.managerId === managerId),
    [allUsers, managerId],
  )

  const { data: teamLeaves = [], isLoading: l2 } = useGetTeamLeavesByManagerQuery(managerId!, {
    skip: !managerId,
  })
  const { data: notifications = [], isLoading: l3 } = useGetUserNotificationsQuery(managerId!, {
    skip: !managerId,
  })
  const { data: allProjectsPage, isLoading: l4 } = useGetProjectsQuery()
  const allProjects: ProjectResponse[] = (allProjectsPage?.content ?? []) as unknown as ProjectResponse[]

  const pendingLeaves = useMemo(() => teamLeaves.filter((l) => l.status === 'PENDING'), [teamLeaves])

  const isLoading = l1 || l2 || l3 || l4

  // Note: teamTimesheets are loaded per-member in the page component using useGetTimesheetsByUserQuery
  // to avoid calling hooks inside loops. The dashboard page can aggregate from there.
  const teamTimesheets: { user: UserResponse; timesheet: TimesheetResponse | null }[] = useMemo(
    () => directReports.map((u) => ({ user: u, timesheet: null })),
    [directReports],
  )

  return {
    teamMembers: directReports,
    teamTimesheets,
    pendingLeaves: pendingLeaves as unknown as LeaveRequestResponse[],
    notifications,
    allProjects,
    allUsers,
    isLoading,
    error: null,
    refresh: () => undefined,
  }
}

// ── useHRDashboard ────────────────────────────────────────────────────────────

interface HRDashboardData {
  allUsers: UserResponse[]
  departments: DepartmentResponse[]
  allProjects: ProjectResponse[]
  recentAuditLogs: AuditLogResponse[]
  allLeaves: LeaveRequestResponse[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useHRDashboard(): HRDashboardData {
  const { data: allUsersPage, isLoading: l1 } = useGetUsersQuery({ size: 500 })
  const allUsers: UserResponse[] = (allUsersPage?.content ?? []) as unknown as UserResponse[]

  const { data: deptsPage, isLoading: l2 } = useGetDepartmentsQuery({ size: 200 })
  const departments: DepartmentResponse[] = (deptsPage?.content ?? []) as DepartmentResponse[]

  const { data: projectsPage, isLoading: l3 } = useGetProjectsQuery()
  const allProjects: ProjectResponse[] = (projectsPage?.content ?? []) as unknown as ProjectResponse[]

  const isLoading = l1 || l2 || l3

  return {
    allUsers,
    departments,
    allProjects,
    recentAuditLogs: [],
    allLeaves: [],
    isLoading,
    error: null,
    refresh: () => undefined,
  }
}
