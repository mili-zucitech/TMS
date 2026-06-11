// ── Common filter params ──────────────────────────────────────────────────────

export interface ReportFilters {
  startDate?: string   // "YYYY-MM-DD"
  endDate?: string     // "YYYY-MM-DD"
  departmentId?: number
  userId?: string       // UUID
  projectId?: number
  leaveTypeId?: number
}

// ── Employee Hours ────────────────────────────────────────────────────────────

export interface EmployeeHoursEntry {
  userId: string
  employeeName: string
  department: string
  totalHours: number
  billableHours: number
  nonBillableHours: number
  weekStartDate: string
}

export interface EmployeeHoursReport {
  entries: EmployeeHoursEntry[]
  totalHours: number
  totalBillableHours: number
  totalNonBillableHours: number
  employeeCount: number
}

// ── Project Utilization ───────────────────────────────────────────────────────

export interface ProjectUtilizationEntry {
  projectId: number
  projectName: string
  allocatedHours: number
  loggedHours: number
  utilizationPercent: number
  billableHours: number
  nonBillableHours: number
  activeEmployees: number
}

export interface ProjectUtilizationReport {
  entries: ProjectUtilizationEntry[]
  totalAllocatedHours: number
  totalLoggedHours: number
  avgUtilizationPercent: number
}

// ── Billable Hours ────────────────────────────────────────────────────────────

export interface BillableHoursEntry {
  userId: string
  employeeName: string
  department: string
  projectId: number
  projectName: string
  billableHours: number
  nonBillableHours: number
  totalHours: number
  billablePercent: number
}

export interface BillableHoursReport {
  entries: BillableHoursEntry[]
  totalBillableHours: number
  totalNonBillableHours: number
  totalHours: number
  overallBillablePercent: number
}

// ── Leave Report ──────────────────────────────────────────────────────────────

export interface LeaveReportEntry {
  userId: string
  employeeName: string
  department: string
  leaveType: string
  totalDays: number
  status: string
  startDate: string
  endDate: string
}

export interface LeaveReport {
  entries: LeaveReportEntry[]
  totalApproved: number
  totalPending: number
  totalRejected: number
  totalDays: number
}

// ── Department Productivity ───────────────────────────────────────────────────

export interface DepartmentProductivityEntry {
  departmentId: number
  departmentName: string
  employeeCount: number
  totalHours: number
  billableHours: number
  avgHoursPerEmployee: number
  utilizationPercent: number
}

export type DepartmentProductivityReport = DepartmentProductivityEntry[]

// ── KPI Summary ───────────────────────────────────────────────────────────────

export interface KpiSummary {
  totalHoursLogged: number
  totalBillableHours: number
  utilizationPercent: number
  activeEmployees: number
  activeProjects: number
  pendingTimesheets: number
}

// ── Overtime Summary ──────────────────────────────────────────────────────────

export interface OvertimeSummaryEntry {
  userId: string
  employeeName: string
  department: string
  weekStartDate: string
  totalHours: number
  overtimeHours: number
  overtimeReason: string | null
}

export interface OvertimeSummaryReport {
  entries: OvertimeSummaryEntry[]
  totalOvertimeWeeks: number
  totalOvertimeHours: number
  affectedEmployees: number
}

// ── Timesheet Compliance ───────────────────────────────────────────────────────

export interface TimesheetComplianceEntry {
  userId: string
  employeeName: string
  department: string
  totalTimesheets: number
  submitted: number
  approved: number
  rejected: number
  draft: number
  compliancePercent: number
}

export interface TimesheetComplianceReport {
  entries: TimesheetComplianceEntry[]
  overallCompliancePercent: number
  totalTimesheets: number
  totalSubmitted: number
  totalApproved: number
  totalRejected: number
}

// ── Task Summary ──────────────────────────────────────────────────────────────

export interface TaskSummaryEntry {
  projectId: number
  projectName: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  todoTasks: number
  completionRate: number
  estimatedHours: number
  loggedHours: number
  variance: number
}

export interface TaskSummaryReport {
  entries: TaskSummaryEntry[]
  totalTasks: number
  totalCompleted: number
  overallCompletionRate: number
  totalEstimatedHours: number
  totalLoggedHours: number
  totalVariance: number
}

// ── Approval Turnaround ───────────────────────────────────────────────────────

export interface ApprovalTurnaroundEntry {
  managerId: string
  managerName: string
  totalApproved: number
  avgDaysToApprove: number
  minDaysToApprove: number
  maxDaysToApprove: number
}

export interface ApprovalTurnaroundReport {
  entries: ApprovalTurnaroundEntry[]
  orgAvgDaysToApprove: number
  totalApproved: number
}

// ── Chart data shapes ─────────────────────────────────────────────────────────

export interface ChartDataPoint {
  name: string
  value?: number
  [key: string]: string | number | undefined
}
