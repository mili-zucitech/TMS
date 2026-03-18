import type { HolidayType } from '../types/holiday.types'

// ── Per-type display config ───────────────────────────────────

export const HOLIDAY_TYPE_CONFIG: Record<
  HolidayType,
  { label: string; color: string; badgeClass: string; dotClass: string }
> = {
  NATIONAL: {
    label: 'National',
    color: '#3b82f6',
    badgeClass:
      'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
    dotClass: 'bg-blue-500',
  },
  COMPANY: {
    label: 'Company',
    color: '#8b5cf6',
    badgeClass:
      'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20',
    dotClass: 'bg-violet-500',
  },
  REGIONAL: {
    label: 'Regional',
    color: '#f59e0b',
    badgeClass:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
}

export const HOLIDAY_TYPES: HolidayType[] = ['NATIONAL', 'COMPANY', 'REGIONAL']

// ── Roles that can create / edit / delete ─────────────────────
export const HOLIDAY_ADMIN_ROLES = ['ADMIN', 'HR'] as const
