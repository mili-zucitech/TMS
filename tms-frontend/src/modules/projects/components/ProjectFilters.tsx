import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { ProjectStatus } from '../types/project.types'

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

interface ProjectFiltersProps {
  statusFilter: string
  onStatusChange: (value: string) => void
  onClear: () => void
  className?: string
}

const selectClass =
  'h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors cursor-pointer text-foreground'

export function ProjectFilters({
  statusFilter,
  onStatusChange,
  onClear,
  className,
}: ProjectFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {statusFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          Clear filters
        </Button>
      )}
    </div>
  )
}
