import { useEffect } from 'react'
import {
  X,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { RoleBadge, StatusBadge } from './UserTable'
import type { UserResponse } from '../types/user.types'

const employmentTypeLabel: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value?: string | number | null
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value ?? '—'}</p>
      </div>
    </div>
  )
}

interface UserDetailsDrawerProps {
  user: UserResponse | null
  open: boolean
  onClose: () => void
  onEdit?: (user: UserResponse) => void
  canModify?: boolean
  departments?: { id: number; name: string }[]
  users?: { id: string; name: string; designation: string | null }[]
}

export function UserDetailsDrawer({
  user,
  open,
  onClose,
  onEdit,
  canModify,
  departments = [],
  users = [],
}: UserDetailsDrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={user ? `${user.name} profile` : 'User details'}
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-sm',
          'bg-background border-l border-border shadow-2xl',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
          'flex flex-col',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold">User Profile</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        {user ? (
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + name hero */}
            <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-muted/60 to-transparent px-5 pb-5 pt-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg shadow-emerald-500/25 select-none">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.designation ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={user.roleName} />
                <StatusBadge status={user.status} />
              </div>
            </div>

            {/* Details */}
            <div className="px-5 pb-8 divide-y divide-border/60">
              <DetailRow icon={CreditCard} label="Employee ID" value={user.employeeId} />
              <DetailRow icon={Mail} label="Email" value={user.email} />
              <DetailRow icon={Phone} label="Phone" value={user.phone} />
              <DetailRow
                icon={Briefcase}
                label="Employment Type"
                value={
                  user.employmentType
                    ? (employmentTypeLabel[user.employmentType] ?? user.employmentType)
                    : undefined
                }
              />
              <DetailRow
                icon={Building2}
                label="Department"
                value={
                  user.departmentId != null
                    ? (departments.find((d) => d.id === user.departmentId)?.name ?? `Dept. ${user.departmentId}`)
                    : undefined
                }
              />
              <DetailRow
                icon={Calendar}
                label="Joining Date"
                value={
                  user.joiningDate
                    ? new Date(user.joiningDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : undefined
                }
              />
              <DetailRow
                icon={Clock}
                label="Member Since"
                value={new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
              <DetailRow
                icon={UserCheck}
                label="Reporting Manager"
                value={
                  user.managerId != null
                    ? (() => {
                        const mgr = users.find((u) => u.id === user.managerId)
                        return mgr
                          ? `${mgr.name}${mgr.designation ? ` · ${mgr.designation}` : ''}`
                          : `ID: ${user.managerId}`
                      })()
                    : undefined
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a user to view details
          </div>
        )}

        {/* Footer */}
        {user && canModify && onEdit && (
          <div className="border-t border-border px-5 py-4 shrink-0">
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
              onClick={() => {
                onEdit(user)
                onClose()
              }}
            >
              Edit User
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
