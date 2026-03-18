import { useCallback, useState } from 'react'
import { CalendarDays, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { ReportFilters } from '../types/report.types'

interface FilterOption {
  label: string
  value: string | number
}

interface ReportFiltersProps {
  filters: ReportFilters
  onApply: (filters: ReportFilters) => void
  departmentOptions?: FilterOption[]
  employeeOptions?: FilterOption[]
  projectOptions?: FilterOption[]
  leaveTypeOptions?: FilterOption[]
  showDepartment?: boolean
  showEmployee?: boolean
  showProject?: boolean
  showLeaveType?: boolean
  className?: string
}

const QUICK_RANGES = [
  { label: 'This week',    days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months',days: 90 },
  { label: 'Last 6 months',days: 180 },
  { label: 'This year',    days: 365 },
] as const

function toISO(date: Date) {
  return date.toISOString().split('T')[0]
}

export function ReportFilters({
  filters,
  onApply,
  departmentOptions = [],
  employeeOptions   = [],
  projectOptions    = [],
  leaveTypeOptions  = [],
  showDepartment = false,
  showEmployee   = false,
  showProject    = false,
  showLeaveType  = false,
  className,
}: ReportFiltersProps) {
  const [local, setLocal] = useState<ReportFilters>(filters)
  const [open, setOpen] = useState(false)

  const set = useCallback(<K extends keyof ReportFilters>(key: K, val: ReportFilters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: val }))
  }, [])

  const applyQuickRange = useCallback((days: number) => {
    const end   = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    const next = { ...local, startDate: toISO(start), endDate: toISO(end) }
    setLocal(next)
    onApply(next)
  }, [local, onApply])

  const handleApply = useCallback(() => {
    onApply(local)
    setOpen(false)
  }, [local, onApply])

  const handleReset = useCallback(() => {
    const empty: ReportFilters = {}
    setLocal(empty)
    onApply(empty)
  }, [onApply])

  const hasActive = Boolean(
    local.startDate || local.endDate || local.departmentId ||
    local.userId    || local.projectId || local.leaveTypeId,
  )

  return (
    <div className={cn('space-y-2', className)}>
      {/* Quick range pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Quick range:
        </span>
        {QUICK_RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => applyQuickRange(r.days)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            open
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActive && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              !
            </span>
          )}
        </button>
        {hasActive && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {open && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Date range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={local.startDate ?? ''}
                onChange={(e) => set('startDate', e.target.value || undefined)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <input
                type="date"
                value={local.endDate ?? ''}
                onChange={(e) => set('endDate', e.target.value || undefined)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {showDepartment && departmentOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <select
                  value={local.departmentId ?? ''}
                  onChange={(e) => set('departmentId', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All departments</option>
                  {departmentOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {showEmployee && employeeOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Employee</label>
                <select
                  value={local.userId ?? ''}
                  onChange={(e) => set('userId', e.target.value || undefined)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All employees</option>
                  {employeeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {showProject && projectOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Project</label>
                <select
                  value={local.projectId ?? ''}
                  onChange={(e) => set('projectId', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All projects</option>
                  {projectOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {showLeaveType && leaveTypeOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Leave Type</label>
                <select
                  value={local.leaveTypeId ?? ''}
                  onChange={(e) => set('leaveTypeId', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All types</option>
                  {leaveTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleApply}>Apply Filters</Button>
            <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </div>
      )}
    </div>
  )
}
