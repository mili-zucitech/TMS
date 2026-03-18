import { cn } from '@/utils/cn'
import type { ProjectStatus } from '../types/project.types'

const badgeMap: Record<ProjectStatus, { label: string; cls: string }> = {
  PLANNED: {
    label: 'Planned',
    cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  },
  ACTIVE: {
    label: 'Active',
    cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  },
  ON_HOLD: {
    label: 'On Hold',
    cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  },
  COMPLETED: {
    label: 'Completed',
    cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',
  },
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const { label, cls } = badgeMap[status] ?? {
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
