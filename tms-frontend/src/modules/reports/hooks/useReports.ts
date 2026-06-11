import { useCallback, useMemo, useState } from 'react'
import {
  useGetEmployeeHoursQuery,
  useGetProjectUtilizationReportQuery,
  useGetBillableHoursQuery,
  useGetKpiSummaryQuery,
  useGetLeaveReportQuery,
  useGetOvertimeSummaryQuery,
  useGetTimesheetComplianceQuery,
  useGetTaskSummaryQuery,
  useGetApprovalTurnaroundQuery,
} from '@/features/reports/reportsApi'
import type {
  ReportFilters,
  DepartmentProductivityEntry,
  DepartmentProductivityReport,
} from '../types/report.types'

// ── Generic report hook shape ─────────────────────────────────────────────────
interface UseReportResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  filters: ReportFilters
  applyFilters: (f: ReportFilters) => void
  refresh: () => void
}

function useReportHookBase<T>(
  useQuery: (filters: ReportFilters | void) => { data?: T | undefined; isLoading: boolean; error?: unknown; refetch: () => unknown },
  initial: ReportFilters = {},
): UseReportResult<T> {
  const [filters, setFilters] = useState<ReportFilters>(initial)
  const { data = null as unknown as T, isLoading, error: queryError, refetch } = useQuery(filters as ReportFilters | void)

  const error = queryError ? 'Failed to load report' : null

  const applyFilters = useCallback((f: ReportFilters) => setFilters(f), [])
  const refresh = useCallback(() => { void refetch() }, [refetch])

  return { data: data ?? null, isLoading, error, filters, applyFilters, refresh }
}

// ── Specialised hooks ─────────────────────────────────────────────────────────

export function useEmployeeHoursReport(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetEmployeeHoursQuery(f),
    initial,
  )
}

export function useProjectUtilizationReport(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetProjectUtilizationReportQuery(f),
    initial,
  )
}

export function useBillableHoursReport(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetBillableHoursQuery(f),
    initial,
  )
}

export function useKpiSummary(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetKpiSummaryQuery(f),
    initial,
  )
}

export function useLeaveReport(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetLeaveReportQuery(f),
    initial,
  )
}

export function useOvertimeSummary(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetOvertimeSummaryQuery(f),
    initial,
  )
}

export function useTimesheetCompliance(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetTimesheetComplianceQuery(f),
    initial,
  )
}

export function useTaskSummary(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetTaskSummaryQuery(f),
    initial,
  )
}

export function useApprovalTurnaround(initial: ReportFilters = {}) {
  return useReportHookBase(
    (f) => useGetApprovalTurnaroundQuery(f),
    initial,
  )
}

/**
 * Department productivity is derived client-side from employee-hours data
 * (mirrors the old reportService.getDepartmentProductivity logic).
 */
export function useDepartmentProductivityReport(initial: ReportFilters = {}): UseReportResult<DepartmentProductivityReport> {
  const [filters, setFilters] = useState<ReportFilters>(initial)
  const { data: empHours, isLoading, error: queryError, refetch } = useGetEmployeeHoursQuery(filters as ReportFilters | void)

  const data = useMemo<DepartmentProductivityReport | null>(() => {
    if (!empHours) return null
    const map = new Map<string, { total: number; billable: number; count: Set<string> }>()
    for (const entry of empHours.entries) {
      const dept = entry.department || 'Unknown'
      const existing = map.get(dept) ?? { total: 0, billable: 0, count: new Set<string>() }
      existing.total    += entry.totalHours
      existing.billable += entry.billableHours
      existing.count.add(entry.userId)
      map.set(dept, existing)
    }
    return Array.from(map.entries()).map<DepartmentProductivityEntry>(([name, v], idx) => ({
      departmentId: idx + 1,
      departmentName: name,
      employeeCount: v.count.size,
      totalHours: v.total,
      billableHours: v.billable,
      avgHoursPerEmployee: v.count.size > 0 ? Math.round((v.total / v.count.size) * 10) / 10 : 0,
      utilizationPercent: v.total > 0 ? Math.round((v.billable / v.total) * 100) : 0,
    }))
  }, [empHours])

  const error = queryError ? 'Failed to load report' : null
  const applyFilters = useCallback((f: ReportFilters) => setFilters(f), [])
  const refresh = useCallback(() => { void refetch() }, [refetch])

  return { data, isLoading, error, filters, applyFilters, refresh }
}

// ── Composite hooks per role ──────────────────────────────────────────────────

export function useHRReports(initial: ReportFilters = {}) {
  const hours      = useEmployeeHoursReport(initial)
  const dept       = useDepartmentProductivityReport(initial)
  const leave      = useLeaveReport(initial)
  const overtime   = useOvertimeSummary(initial)
  const compliance = useTimesheetCompliance(initial)

  const isLoading = hours.isLoading || dept.isLoading || leave.isLoading
  const error     = hours.error ?? dept.error ?? leave.error ?? null

  const applyFilters = useCallback(
    (f: ReportFilters) => {
      hours.applyFilters(f); dept.applyFilters(f); leave.applyFilters(f)
      overtime.applyFilters(f); compliance.applyFilters(f)
    },
    [hours, dept, leave, overtime, compliance],
  )
  const refresh = useCallback(
    () => { hours.refresh(); dept.refresh(); leave.refresh(); overtime.refresh(); compliance.refresh() },
    [hours, dept, leave, overtime, compliance],
  )

  return { hours, dept, leave, overtime, compliance, isLoading, error, applyFilters, refresh }
}

export function useManagerReports(initial: ReportFilters = {}) {
  const hours      = useEmployeeHoursReport(initial)
  const billable   = useBillableHoursReport(initial)
  const leave      = useLeaveReport(initial)
  const projects   = useProjectUtilizationReport(initial)
  const overtime   = useOvertimeSummary(initial)
  const compliance = useTimesheetCompliance(initial)
  const tasks      = useTaskSummary(initial)

  const isLoading = hours.isLoading || billable.isLoading || leave.isLoading
  const error     = hours.error ?? billable.error ?? leave.error ?? null

  const applyFilters = useCallback(
    (f: ReportFilters) => {
      hours.applyFilters(f); billable.applyFilters(f); leave.applyFilters(f)
      projects.applyFilters(f); overtime.applyFilters(f); compliance.applyFilters(f); tasks.applyFilters(f)
    },
    [hours, billable, leave, projects, overtime, compliance, tasks],
  )
  const refresh = useCallback(
    () => { hours.refresh(); billable.refresh(); leave.refresh(); projects.refresh(); overtime.refresh(); compliance.refresh(); tasks.refresh() },
    [hours, billable, leave, projects, overtime, compliance, tasks],
  )

  return { hours, billable, leave, projects, overtime, compliance, tasks, isLoading, error, applyFilters, refresh }
}

export function useDirectorReports(initial: ReportFilters = {}) {
  const hours      = useEmployeeHoursReport(initial)
  const projects   = useProjectUtilizationReport(initial)
  const billable   = useBillableHoursReport(initial)
  const kpi        = useKpiSummary(initial)
  const dept       = useDepartmentProductivityReport(initial)
  const tasks      = useTaskSummary(initial)
  const turnaround = useApprovalTurnaround(initial)
  const compliance = useTimesheetCompliance(initial)
  const overtime   = useOvertimeSummary(initial)

  const isLoading = hours.isLoading || projects.isLoading || billable.isLoading || kpi.isLoading
  const error     = hours.error ?? projects.error ?? billable.error ?? kpi.error ?? null

  const applyFilters = useCallback(
    (f: ReportFilters) => {
      hours.applyFilters(f); projects.applyFilters(f)
      billable.applyFilters(f); kpi.applyFilters(f)
      dept.applyFilters(f); tasks.applyFilters(f)
      turnaround.applyFilters(f); compliance.applyFilters(f); overtime.applyFilters(f)
    },
    [hours, projects, billable, kpi, dept, tasks, turnaround, compliance, overtime],
  )
  const refresh = useCallback(
    () => {
      hours.refresh(); projects.refresh(); billable.refresh(); kpi.refresh()
      dept.refresh(); tasks.refresh(); turnaround.refresh(); compliance.refresh(); overtime.refresh()
    },
    [hours, projects, billable, kpi, dept, tasks, turnaround, compliance, overtime],
  )

  return { hours, projects, billable, kpi, dept, tasks, turnaround, compliance, overtime, isLoading, error, applyFilters, refresh }
}
