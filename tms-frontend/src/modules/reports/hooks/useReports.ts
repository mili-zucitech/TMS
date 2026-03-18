import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import reportService from '../services/reportService'
import type {
  EmployeeHoursReport,
  ProjectUtilizationReport,
  BillableHoursReport,
  LeaveReport,
  DepartmentProductivityReport,
  KpiSummary,
  ReportFilters,
} from '../types/report.types'

// ── Generic async report hook ─────────────────────────────────────────────────

function useReportData<T>(
  fetcher: (filters: ReportFilters) => Promise<T>,
  initialFilters: ReportFilters = {},
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(initialFilters)
  // Simple cache: stringified filters → result
  const cache = useRef<Map<string, T>>(new Map())

  const load = useCallback(
    async (f?: ReportFilters) => {
      const activeFilters = f ?? filters
      const key = JSON.stringify(activeFilters)
      if (cache.current.has(key)) {
        setData(cache.current.get(key)!)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetcher(activeFilters)
        cache.current.set(key, result)
        setData(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load report'
        setError(msg)
        toast.error(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [fetcher, filters],
  )

  useEffect(() => {
    void load(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = useCallback(
    (newFilters: ReportFilters) => {
      setFilters(newFilters)
      void load(newFilters)
    },
    [load],
  )

  const refresh = useCallback(() => {
    cache.current.clear()
    void load(filters)
  }, [load, filters])

  return { data, isLoading, error, filters, applyFilters, refresh }
}

// ── Specialised hooks ─────────────────────────────────────────────────────────

export function useEmployeeHoursReport(initial: ReportFilters = {}) {
  return useReportData<EmployeeHoursReport>(
    (f) => reportService.getEmployeeHours(f),
    initial,
  )
}

export function useProjectUtilizationReport(initial: ReportFilters = {}) {
  return useReportData<ProjectUtilizationReport>(
    (f) => reportService.getProjectUtilization(f),
    initial,
  )
}

export function useBillableHoursReport(initial: ReportFilters = {}) {
  return useReportData<BillableHoursReport>(
    (f) => reportService.getBillableHours(f),
    initial,
  )
}

export function useLeaveReport(initial: ReportFilters = {}) {
  return useReportData<LeaveReport>(
    (f) => reportService.getLeaveReport(f),
    initial,
  )
}

export function useDepartmentProductivityReport(initial: ReportFilters = {}) {
  return useReportData<DepartmentProductivityReport>(
    (f) => reportService.getDepartmentProductivity(f),
    initial,
  )
}

export function useKpiSummary(initial: ReportFilters = {}) {
  return useReportData<KpiSummary>(
    (f) => reportService.getKpiSummary(f),
    initial,
  )
}

// ── Composite hooks per role ──────────────────────────────────────────────────

export function useHRReports(initial: ReportFilters = {}) {
  const hours     = useEmployeeHoursReport(initial)
  const leave     = useLeaveReport(initial)
  const dept      = useDepartmentProductivityReport(initial)

  const isLoading = hours.isLoading || leave.isLoading || dept.isLoading
  const error     = hours.error ?? leave.error ?? dept.error ?? null

  const applyFilters = useCallback(
    (f: ReportFilters) => {
      hours.applyFilters(f)
      leave.applyFilters(f)
      dept.applyFilters(f)
    },
    [hours, leave, dept],
  )

  const refresh = useCallback(() => {
    hours.refresh()
    leave.refresh()
    dept.refresh()
  }, [hours, leave, dept])

  return { hours, leave, dept, isLoading, error, applyFilters, refresh }
}

export function useManagerReports(initial: ReportFilters = {}) {
  const hours    = useEmployeeHoursReport(initial)
  const billable = useBillableHoursReport(initial)

  const isLoading = hours.isLoading || billable.isLoading
  const error     = hours.error ?? billable.error ?? null

  const applyFilters = useCallback(
    (f: ReportFilters) => {
      hours.applyFilters(f)
      billable.applyFilters(f)
    },
    [hours, billable],
  )

  const refresh = useCallback(() => {
    hours.refresh()
    billable.refresh()
  }, [hours, billable])

  return { hours, billable, isLoading, error, applyFilters, refresh }
}

export function useDirectorReports(initial: ReportFilters = {}) {
  const hours      = useEmployeeHoursReport(initial)
  const projects   = useProjectUtilizationReport(initial)
  const billable   = useBillableHoursReport(initial)
  const kpi        = useKpiSummary(initial)

  const isLoading = hours.isLoading || projects.isLoading || billable.isLoading || kpi.isLoading
  const error     = hours.error ?? projects.error ?? billable.error ?? kpi.error ?? null

  const applyFilters = useCallback(
    (f: ReportFilters) => {
      hours.applyFilters(f)
      projects.applyFilters(f)
      billable.applyFilters(f)
      kpi.applyFilters(f)
    },
    [hours, projects, billable, kpi],
  )

  const refresh = useCallback(() => {
    hours.refresh()
    projects.refresh()
    billable.refresh()
    kpi.refresh()
  }, [hours, projects, billable, kpi])

  return { hours, projects, billable, kpi, isLoading, error, applyFilters, refresh }
}
