import { useEffect, useRef, useState } from 'react'
import { User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import userModuleService from '@/modules/users/services/userService'
import type { UserResponse } from '@/modules/users/types/user.types'

type BadgeVariant = 'default' | 'destructive' | 'info' | 'success' | 'warning' | 'violet' | 'secondary'

const ROLE_VARIANT: Record<string, BadgeVariant> = {
  ADMIN:      'destructive',
  HR:         'info',
  HR_MANAGER: 'violet',
  MANAGER:    'warning',
  DIRECTOR:   'success',
  EMPLOYEE:   'secondary',
}

interface InfoRowProps { label: string; value: string }
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-right">{value}</p>
    </div>
  )
}

export function ProfileSection() {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current || !authUser?.userId) return
    loadedRef.current = true
    userModuleService.getUserById(authUser.userId)
      .then(setProfile)
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [authUser])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" />
          Profile Information
        </CardTitle>
        <CardDescription>Your account details as recorded in the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-md">
            {(profile?.name ?? authUser?.email ?? '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile?.name ?? '�'}</p>
            <p className="truncate text-sm text-muted-foreground">{authUser?.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {profile?.roleName && (
                <Badge variant={ROLE_VARIANT[profile.roleName] ?? 'secondary'}>
                  {profile.roleName.replace('_', ' ')}
                </Badge>
              )}
              {profile?.employeeId && (
                <Badge variant="outline">{profile.employeeId}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border px-4">
          <InfoRow label="Full Name"   value={profile?.name ?? '�'} />
          <InfoRow label="Email"       value={authUser?.email ?? '�'} />
          <InfoRow label="Phone"       value={profile?.phone ?? '�'} />
          <InfoRow label="Designation" value={profile?.designation ?? '�'} />
          {profile?.employmentType && (
            <InfoRow label="Employment Type" value={profile.employmentType.replace('_', ' ')} />
          )}
          {profile?.joiningDate && (
            <InfoRow
              label="Joining Date"
              value={new Date(profile.joiningDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            />
          )}
          <InfoRow label="Status" value={profile?.status ?? '�'} />
        </div>
      </CardContent>
    </Card>
  )
}
