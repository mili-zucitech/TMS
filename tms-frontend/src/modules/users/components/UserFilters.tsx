import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { RoleName, UserStatus } from '../types/user.types'

const ROLES: { value: RoleName; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR', label: 'HR' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYEE', label: 'Employee' },
]

const STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
]

interface UserFiltersProps {
  roleFilter: string
  statusFilter: string
  onRoleChange: (value: string) => void
  onStatusChange: (value: string) => void
  onClear: () => void
  className?: string
}

const selectClass =
  'h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors cursor-pointer text-foreground'

export function UserFilters({
  roleFilter,
  statusFilter,
  onRoleChange,
  onStatusChange,
  onClear,
  className,
}: UserFiltersProps) {
  const hasActiveFilters = !!roleFilter || !!statusFilter

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <select
        value={roleFilter}
        onChange={(e) => onRoleChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by role"
      >
        <option value="">All Roles</option>
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

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

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          Clear filters
        </Button>
      )}
    </div>
  )
}
