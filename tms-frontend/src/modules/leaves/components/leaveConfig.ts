import type { LeaveStatus } from '../types/leave.types'

// ── Status display config ────────────────────────────────────

export const LEAVE_STATUS_CONFIG: Record<
  LeaveStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: 'Pending',
    badgeClass:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass:
      'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',
    dotClass: 'bg-red-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass:
      'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20',
    dotClass: 'bg-slate-400',
  },
}

export const LEAVE_STATUSES: LeaveStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]

// ── Calendar colors per status ────────────────────────────────

export const LEAVE_STATUS_CAL_COLOR: Record<LeaveStatus, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  CANCELLED: '#94a3b8',
}
