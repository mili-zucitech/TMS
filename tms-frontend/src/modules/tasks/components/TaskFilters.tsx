import { Button } from '@/components/ui/Button'
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

const selectClass =
  'h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors cursor-pointer text-foreground'

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

      <select
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by priority"
      >
        <option value="">All Priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        value={projectFilter}
        onChange={(e) => onProjectChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by project"
      >
        <option value="">All Projects</option>
        {projects.map((p) => (
          <option key={p.id} value={String(p.id)}>
            {p.name}
          </option>
        ))}
      </select>

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
