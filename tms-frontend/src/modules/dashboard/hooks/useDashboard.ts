import { useCallback, useEffect, useState } from 'react'
import {
  getAllDepartments,
  getAllProjects,
  getAllUsers,
  getLeaveBalancesForUser,
  getLeavesForUser,
  getMyTasks,
  getNotificationsForUser,
  getProjectAssignmentsForUser,
  getTimeEntriesForTimesheet,
  getTimesheetsForUser,
  getTeamLeaveRequests,
  getAllAuditLogs,
} from '../services/dashboardService'
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

// ── Week helpers ──────────────────────────────────────────────────────────────

export function getWeekStartDate(): string {
  const now = new Date()
  const dow = now.getDay()
  const daysBack = dow === 0 ? 6 : dow - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysBack)
  return monday.toISOString().split('T')[0]
}

export function getWeekEndDate(): string {
  const monday = new Date(getWeekStartDate())
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday.toISOString().split('T')[0]
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
  const [data, setData] = useState<Omit<EmployeeDashboardData, 'isLoading' | 'error' | 'refresh'>>({
    weekSummary: null,
    timeEntries: [],
    projectAssignments: [],
    projects: [],
    tasks: [],
    leaveBalances: [],
    pendingLeaves: [],
    notifications: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekStart = getWeekStartDate()
  const weekEnd = getWeekEndDate()

  const load = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const [timesheets, assignments, allProjects, tasks, balances, leaves, notifications] =
        await Promise.allSettled([
          getTimesheetsForUser(userId),
          getProjectAssignmentsForUser(userId),
          getAllProjects(),
          getMyTasks(),
          getLeaveBalancesForUser(userId),
          getLeavesForUser(userId),
          getNotificationsForUser(userId),
        ])

      const ts: TimesheetResponse[] = timesheets.status === 'fulfilled' ? timesheets.value : []
      const currentWeekTS = ts.find((t) => t.weekStartDate === weekStart) ?? null

      let timeEntries: TimeEntryResponse[] = []
      if (currentWeekTS) {
        const entriesResult = await getTimeEntriesForTimesheet(currentWeekTS.id)
        timeEntries = entriesResult
      }

      const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0)

      const weekSummary: WeeklyTimesheetSummary = {
        timesheet: currentWeekTS,
        totalMinutes,
        displayStatus: currentWeekTS ? currentWeekTS.status : 'NOT_SUBMITTED',
        weekStart,
        weekEnd,
      }

      const pa: ProjectAssignmentResponse[] = assignments.status === 'fulfilled' ? assignments.value : []
      const ap: ProjectResponse[] = allProjects.status === 'fulfilled' ? allProjects.value : []
      const assignedProjectIds = new Set(pa.map((a) => a.projectId))
      const myProjects = ap.filter((p) => assignedProjectIds.has(p.id))

      const myTasks: TaskResponse[] = tasks.status === 'fulfilled' ? tasks.value : []
      const lb: LeaveBalanceResponse[] = balances.status === 'fulfilled' ? balances.value : []
      const lr: LeaveRequestResponse[] = leaves.status === 'fulfilled' ? leaves.value : []
      const pendingLeaves = lr.filter((l) => l.status === 'PENDING')
      const notifs: NotificationResponse[] = notifications.status === 'fulfilled' ? notifications.value : []

      setData({
        weekSummary,
        timeEntries,
        projectAssignments: pa,
        projects: myProjects,
        tasks: myTasks,
        leaveBalances: lb,
        pendingLeaves,
        notifications: notifs,
      })
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [userId, weekStart, weekEnd])

  useEffect(() => {
    void load()
  }, [load])

  return { ...data, isLoading, error, refresh: load }
}

// ── useManagerDashboard ───────────────────────────────────────────────────────

interface ManagerDashboardData {
  teamMembers: UserResponse[]
  teamTimesheets: { user: UserResponse; timesheet: TimesheetResponse | null }[]
  pendingLeaves: LeaveRequestResponse[]
  notifications: NotificationResponse[]
  allProjects: ProjectResponse[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useManagerDashboard(managerId: string | null): ManagerDashboardData {
  const [data, setData] = useState<Omit<ManagerDashboardData, 'isLoading' | 'error' | 'refresh'>>({
    teamMembers: [],
    teamTimesheets: [],
    pendingLeaves: [],
    notifications: [],
    allProjects: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const weekStart = getWeekStartDate()

  const load = useCallback(async () => {
    if (!managerId) return
    setIsLoading(true)
    setError(null)

    try {
      const [allUsers, teamLeaves, notifications, allProjects] = await Promise.allSettled([
        getAllUsers(),
        getTeamLeaveRequests(managerId),
        getNotificationsForUser(managerId),
        getAllProjects(),
      ])

      const users: UserResponse[] = allUsers.status === 'fulfilled' ? allUsers.value : []
      const directReports = users.filter((u) => u.managerId === managerId)

      // Fetch timesheets for each direct report
      const tsResults = await Promise.allSettled(
        directReports.map((u) => getTimesheetsForUser(u.id)),
      )

      const teamTimesheets = directReports.map((user, idx) => {
        const result = tsResults[idx]
        const sheets: TimesheetResponse[] = result.status === 'fulfilled' ? result.value : []
        const ts = sheets.find((t) => t.weekStartDate === weekStart) ?? null
        return { user, timesheet: ts }
      })

      const lr: LeaveRequestResponse[] = teamLeaves.status === 'fulfilled' ? teamLeaves.value : []
      const pending = lr.filter((l) => l.status === 'PENDING')
      const notifs: NotificationResponse[] = notifications.status === 'fulfilled' ? notifications.value : []
      const ap: ProjectResponse[] = allProjects.status === 'fulfilled' ? allProjects.value : []

      setData({
        teamMembers: directReports,
        teamTimesheets,
        pendingLeaves: pending,
        notifications: notifs,
        allProjects: ap,
      })
    } catch {
      setError('Failed to load manager dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [managerId, weekStart])

  useEffect(() => {
    void load()
  }, [load])

  return { ...data, isLoading, error, refresh: load }
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
  const [data, setData] = useState<Omit<HRDashboardData, 'isLoading' | 'error' | 'refresh'>>({
    allUsers: [],
    departments: [],
    allProjects: [],
    recentAuditLogs: [],
    allLeaves: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [users, departments, projects, auditLogs] = await Promise.allSettled([
        getAllUsers(),
        getAllDepartments(),
        getAllProjects(),
        getAllAuditLogs(),
      ])

      const allUsers: UserResponse[] = users.status === 'fulfilled' ? users.value : []
      const depts: DepartmentResponse[] = departments.status === 'fulfilled' ? departments.value : []
      const ap: ProjectResponse[] = projects.status === 'fulfilled' ? projects.value : []
      const logs: AuditLogResponse[] = auditLogs.status === 'fulfilled' ? auditLogs.value : []

      setData({
        allUsers,
        departments: depts,
        allProjects: ap,
        recentAuditLogs: logs.slice(0, 10),
        allLeaves: [],
      })
    } catch {
      setError('Failed to load HR dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ...data, isLoading, error, refresh: load }
}
