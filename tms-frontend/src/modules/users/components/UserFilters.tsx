import { Button } from '@/components/ui/Button'
import { AppSelect } from '@/components/ui/Select'
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
      <div className="w-36">
        <AppSelect
          value={roleFilter}
          onChange={(v) => onRoleChange(String(v))}
          options={[{ value: '', label: 'All Roles' }, ...ROLES]}
          placeholder="All Roles"
          isSearchable={false}
        />
      </div>

      <div className="w-40">
        <AppSelect
          value={statusFilter}
          onChange={(v) => onStatusChange(String(v))}
          options={[{ value: '', label: 'All Statuses' }, ...STATUSES]}
          placeholder="All Statuses"
          isSearchable={false}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          Clear filters
        </Button>
      )}
    </div>
  )
}
