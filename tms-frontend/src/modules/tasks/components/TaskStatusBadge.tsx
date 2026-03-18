import { cn } from '@/utils/cn'
import type { TaskStatus } from '../types/task.types'

export const ALL_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']

export const statusMap: Record<TaskStatus, { label: string; cls: string }> = {
  TODO:        { label: 'To Do',       cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20' },
  IN_REVIEW:   { label: 'In Review',   cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' },
  COMPLETED:   { label: 'Completed',   cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' },
  BLOCKED:     { label: 'Blocked',     cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' },
}

interface TaskStatusBadgeProps {
  status: TaskStatus
  className?: string
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const { label, cls } =
    statusMap[status] ?? {
      label: status,
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
