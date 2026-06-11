import { Button } from '@/components/ui/Button'
import { AppSelect } from '@/components/ui/Select'
import { cn } from '@/utils/cn'
import type { TaskStatus, TaskPriority } from '../types/task.types'

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW',   label: 'In Review' },
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'BLOCKED',     label: 'Blocked' },
]

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'LOW',      label: 'Low' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'HIGH',     label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

interface TaskFiltersProps {
  statusFilter: string
  priorityFilter: string
  projectFilter: string
  projects: { id: number; name: string }[]
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onProjectChange: (value: string) => void
  onClear: () => void
  className?: string
}

export function TaskFilters({
  statusFilter,
  priorityFilter,
  projectFilter,
  projects,
  onStatusChange,
  onPriorityChange,
  onProjectChange,
  onClear,
  className,
}: TaskFiltersProps) {
  const hasFilters = !!statusFilter || !!priorityFilter || !!projectFilter

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

      <div className="w-40">
        <AppSelect
          value={priorityFilter}
          onChange={(v) => onPriorityChange(String(v))}
          options={[{ value: '', label: 'All Priorities' }, ...PRIORITIES]}
          placeholder="All Priorities"
          isSearchable={false}
        />
      </div>

      <div className="w-44">
        <AppSelect
          value={projectFilter}
          onChange={(v) => onProjectChange(String(v))}
          options={[{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
          placeholder="All Projects"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground"
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
