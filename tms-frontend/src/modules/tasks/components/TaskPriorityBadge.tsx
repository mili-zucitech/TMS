import { cn } from '@/utils/cn'
import type { TaskPriority } from '../types/task.types'

const priorityMap: Record<TaskPriority, { label: string; cls: string }> = {
  LOW:      { label: 'Low',      cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20' },
  MEDIUM:   { label: 'Medium',   cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20' },
  HIGH:     { label: 'High',     cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' },
  CRITICAL: { label: 'Critical', cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' },
}

interface TaskPriorityBadgeProps {
  priority: TaskPriority
  className?: string
}

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  const { label, cls } =
    priorityMap[priority] ?? {
      label: priority,
      cls: 'bg-slate-500/10 text-slate-600 border border-slate-500/20',
    }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        cls,
        className,
      )}
    >
      {label}
    </span>
  )
}
