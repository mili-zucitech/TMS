import axiosClient from '@/api/axiosClient'
import type { ApiResponse } from '@/types/api.types'
import type {
  EmployeeHoursReport,
  ProjectUtilizationReport,
  BillableHoursReport,
  LeaveReport,
  DepartmentProductivityReport,
  KpiSummary,
  ReportFilters,
} from '../types/report.types'

const REPORT_BASE = '/reports'

// ── Query string builder ──────────────────────────────────────────────────────
function toQuery(filters: ReportFilters): string {
  const params = new URLSearchParams()
  if (filters.startDate)    params.set('startDate',    filters.startDate)
  if (filters.endDate)      params.set('endDate',      filters.endDate)
  if (filters.departmentId) params.set('departmentId', String(filters.departmentId))
  if (filters.userId)       params.set('userId',       filters.userId)
  if (filters.projectId)    params.set('projectId',    String(filters.projectId))
  if (filters.leaveTypeId)  params.set('leaveTypeId',  String(filters.leaveTypeId))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

const reportService = {
  // ── Employee hours (HR / Director) ───────────────────────────────────────
  async getEmployeeHours(filters: ReportFilters = {}): Promise<EmployeeHoursReport> {
    const { data } = await axiosClient.get<ApiResponse<EmployeeHoursReport>>(
      `${REPORT_BASE}/employee-hours${toQuery(filters)}`,
    )
    return data.data
  },

  // ── Project utilization (Director / Manager) ─────────────────────────────
  async getProjectUtilization(filters: ReportFilters = {}): Promise<ProjectUtilizationReport> {
    const { data } = await axiosClient.get<ApiResponse<ProjectUtilizationReport>>(
      `${REPORT_BASE}/project-utilization${toQuery(filters)}`,
    )
    return data.data
  },

  // ── Billable hours (all roles, but scoped by role on backend) ────────────
  async getBillableHours(filters: ReportFilters = {}): Promise<BillableHoursReport> {
    const { data } = await axiosClient.get<ApiResponse<BillableHoursReport>>(
      `${REPORT_BASE}/billable-hours${toQuery(filters)}`,
    )
    return data.data
  },

  // ── HR-specific aggregates ────────────────────────────────────────────────
  async getHRReports(filters: ReportFilters = {}): Promise<{
    employeeHours: EmployeeHoursReport
    leaveReport: LeaveReport
    departmentProductivity: DepartmentProductivityReport
  }> {
    // Fetch in parallel
    const [empHours, leave, deptProd] = await Promise.all([
      reportService.getEmployeeHours(filters),
      reportService.getLeaveReport(filters),
      reportService.getDepartmentProductivity(filters),
    ])
    return { employeeHours: empHours, leaveReport: leave, departmentProductivity: deptProd }
  },

  // ── Manager-specific aggregates ───────────────────────────────────────────
  async getManagerReports(filters: ReportFilters = {}): Promise<{
    employeeHours: EmployeeHoursReport
    billableHours: BillableHoursReport
  }> {
    const [empHours, billable] = await Promise.all([
      reportService.getEmployeeHours(filters),
      reportService.getBillableHours(filters),
    ])
    return { employeeHours: empHours, billableHours: billable }
  },

  // ── Director-specific aggregates ─────────────────────────────────────────
  async getDirectorReports(filters: ReportFilters = {}): Promise<{
    employeeHours: EmployeeHoursReport
    projectUtilization: ProjectUtilizationReport
    billableHours: BillableHoursReport
    kpiSummary: KpiSummary
  }> {
    const [empHours, projUtil, billable, kpi] = await Promise.all([
      reportService.getEmployeeHours(filters),
      reportService.getProjectUtilization(filters),
      reportService.getBillableHours(filters),
      reportService.getKpiSummary(filters),
    ])
    return { employeeHours: empHours, projectUtilization: projUtil, billableHours: billable, kpiSummary: kpi }
  },

  // ── Leave report (HR) ─────────────────────────────────────────────────────
  async getLeaveReport(filters: ReportFilters = {}): Promise<LeaveReport> {
    // The leave endpoint returns raw leave requests; adapt to report shape
    const { data } = await axiosClient.get<ApiResponse<LeaveReport>>(
      `/leaves${toQuery(filters)}`,
    )
    // If backend wraps leave requests, we compose the report client-side
    const raw = data.data as unknown as {
      id: number
      userId: string
      employeeName?: string
      leaveTypeName: string
      totalDays: number
      status: string
      startDate: string
      endDate: string
    }[]
    if (Array.isArray(raw)) {
      const entries = raw.map((r) => ({
        userId: r.userId,
        employeeName: r.employeeName ?? String(r.userId),
        department: '',
        leaveType: r.leaveTypeName ?? 'Unknown',
        totalDays: r.totalDays ?? 0,
        status: r.status ?? 'UNKNOWN',
        startDate: r.startDate,
        endDate: r.endDate,
      }))
      return {
        entries,
        totalApproved: entries.filter((e) => e.status === 'APPROVED').length,
        totalPending:  entries.filter((e) => e.status === 'PENDING').length,
        totalRejected: entries.filter((e) => e.status === 'REJECTED').length,
        totalDays: entries.reduce((s, e) => s + e.totalDays, 0),
      }
    }
    return data.data as unknown as LeaveReport
  },

  // ── Department productivity (HR) ─────────────────────────────────────────
  async getDepartmentProductivity(filters: ReportFilters = {}): Promise<DepartmentProductivityReport> {
    // Derived from employee-hours, grouped by department client-side
    const report = await reportService.getEmployeeHours(filters)
    const map = new Map<string, { total: number; billable: number; count: Set<string> }>()
    for (const entry of report.entries) {
      const dept = entry.department || 'Unknown'
      const existing = map.get(dept) ?? { total: 0, billable: 0, count: new Set() }
      existing.total    += entry.totalHours
      existing.billable += entry.billableHours
      existing.count.add(entry.userId)
      map.set(dept, existing)
    }
    return Array.from(map.entries()).map(([name, v], idx) => ({
      departmentId: idx + 1,
      departmentName: name,
      employeeCount: v.count.size,
      totalHours: v.total,
      billableHours: v.billable,
      avgHoursPerEmployee: v.count.size > 0 ? Math.round((v.total / v.count.size) * 10) / 10 : 0,
      utilizationPercent: v.total > 0 ? Math.round((v.billable / v.total) * 100) : 0,
    }))
  },

  // ── KPI summary (Director) ────────────────────────────────────────────────
  async getKpiSummary(filters: ReportFilters = {}): Promise<KpiSummary> {
    const [hours, billable] = await Promise.all([
      reportService.getEmployeeHours(filters),
      reportService.getBillableHours(filters),
    ])
    return {
      totalHoursLogged:   hours.totalHours,
      totalBillableHours: hours.totalBillableHours,
      utilizationPercent: hours.totalHours > 0
        ? Math.round((hours.totalBillableHours / hours.totalHours) * 100)
        : 0,
      activeEmployees:    hours.employeeCount,
      activeProjects:     billable.entries
        ? new Set(billable.entries.map((e) => e.projectId)).size
        : 0,
      pendingTimesheets:  0, // populated from timesheet module if needed
    }
  },
}

export default reportService
