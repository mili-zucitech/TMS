import { Button } from '@/components/ui/Button'
import { AppSelect } from '@/components/ui/Select'
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

export function ProjectFilters({
  statusFilter,
  onStatusChange,
  onClear,
  className,
}: ProjectFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="w-40">
        <AppSelect
          value={statusFilter}
          onChange={(v) => onStatusChange(String(v))}
          options={[{ value: '', label: 'All Statuses' }, ...STATUSES]}
          placeholder="All Statuses"
          isSearchable={false}
        />
      </div>

      {statusFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          Clear filters
        </Button>
      )}
    </div>
  )
}
