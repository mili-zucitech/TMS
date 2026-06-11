import { baseApi } from '@/store/baseApi'
import type {
  EmployeeHoursReport,
  ProjectUtilizationReport,
  BillableHoursReport,
  LeaveReport,
  ReportFilters,
  KpiSummary,
  OvertimeSummaryReport,
  TimesheetComplianceReport,
  TaskSummaryReport,
  ApprovalTurnaroundReport,
} from '@/modules/reports/types/report.types'

function filtersToParams(filters: ReportFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (filters.startDate)    params.startDate    = filters.startDate
  if (filters.endDate)      params.endDate      = filters.endDate
  if (filters.departmentId) params.departmentId = filters.departmentId
  if (filters.userId)       params.userId       = filters.userId
  if (filters.projectId)    params.projectId    = filters.projectId
  if (filters.leaveTypeId)  params.leaveTypeId  = filters.leaveTypeId
  return params
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployeeHours: builder.query<EmployeeHoursReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/employee-hours',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getProjectUtilizationReport: builder.query<ProjectUtilizationReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/project-utilization',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getBillableHours: builder.query<BillableHoursReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/billable-hours',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getKpiSummary: builder.query<KpiSummary, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/kpi-summary',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getLeaveReport: builder.query<LeaveReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/leave-report',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getOvertimeSummary: builder.query<OvertimeSummaryReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/overtime-summary',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getTimesheetCompliance: builder.query<TimesheetComplianceReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/timesheet-compliance',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getTaskSummary: builder.query<TaskSummaryReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/task-summary',
        params: filtersToParams(filters ?? {}),
      }),
    }),
    getApprovalTurnaround: builder.query<ApprovalTurnaroundReport, ReportFilters | void>({
      query: (filters) => ({
        url: '/reports/approval-turnaround',
        params: filtersToParams(filters ?? {}),
      }),
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetEmployeeHoursQuery,
  useGetProjectUtilizationReportQuery,
  useGetBillableHoursQuery,
  useGetKpiSummaryQuery,
  useGetLeaveReportQuery,
  useGetOvertimeSummaryQuery,
  useGetTimesheetComplianceQuery,
  useGetTaskSummaryQuery,
  useGetApprovalTurnaroundQuery,
} = reportsApi
