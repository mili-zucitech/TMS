import { cn } from '@/utils/cn'
import type { TimesheetStatus } from '../types/timesheet.types'

const statusMap: Record<TimesheetStatus, { label: string; cls: string }> = {
  DRAFT:     { label: 'Draft',     cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20' },
  SUBMITTED: { label: 'Submitted', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20' },
  APPROVED:  { label: 'Approved',  cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' },
  REJECTED:  { label: 'Rejected',  cls: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' },
  LOCKED:    { label: 'Locked',    cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20' },
}

interface TimesheetStatusBadgeProps {
  status: TimesheetStatus
  className?: string
}

export function TimesheetStatusBadge({ status, className }: TimesheetStatusBadgeProps) {
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
