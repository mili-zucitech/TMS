import { useMemo, useState } from 'react'
import {
  Users,
  RefreshCw,
  Mail,
  Phone,
  Briefcase,
  AlertCircle,
  Search,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { useMyTeam } from '../hooks/useMyTeam'
import {
  RoleBadge,
  StatusBadge,
} from '@/modules/users/components/UserTable'
import type { UserResponse, UserStatus } from '@/modules/users/types/user.types'

// ── Stat card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card px-5 py-4 flex flex-col gap-1',
        colorClass,
      )}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </div>
  )
}

// ── Member card ───────────────────────────────────────────────

function MemberCard({ member, isDirectReport }: { member: UserResponse; isDirectReport?: boolean }) {
  const initials = member.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold shadow">
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm truncate">{member.name}</p>
              <RoleBadge role={member.roleName} />
              <StatusBadge status={member.status} />
              {isDirectReport && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                  Direct Report
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground font-mono">{member.employeeId}</p>

            <div className="flex flex-col gap-1 mt-1">
              {member.designation && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  {member.designation}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{member.email}</span>
              </span>
              {member.phone && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  {member.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Skeleton ──────────────────────────────────────────────────

function MemberCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ label: string; value: UserStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'On Leave', value: 'ON_LEAVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

export default function MyTeamPage() {
  const { user } = useAuth()
  const userId = user?.userId ?? null
  const role = user?.roleName ?? null

  const { members, directReportIds, isLoading, error, fetchTeam, context } = useMyTeam(userId, role)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter((m) => {
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.employeeId.toLowerCase().includes(q) ||
        (m.designation ?? '').toLowerCase().includes(q)
      const matchStatus = !statusFilter || m.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [members, search, statusFilter])

  // ── Stats ──────────────────────────────────────────────────
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length
  const onLeaveCount = members.filter((m) => m.status === 'ON_LEAVE').length
  const inactiveCount = members.filter(
    (m) => m.status !== 'ACTIVE' && m.status !== 'ON_LEAVE',
  ).length

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Team</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading…'
                  : context === 'department'
                    ? `${filtered.length} of ${members.length} colleague${members.length !== 1 ? 's' : ''} in your department`
                    : context === 'both'
                      ? `${filtered.length} of ${members.length} member${members.length !== 1 ? 's' : ''} (direct reports + department)`
                      : `${filtered.length} of ${members.length} direct report${members.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => void fetchTeam()}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        {!isLoading && !error && members.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Members" value={members.length} colorClass="" />
            <StatCard label="Active" value={activeCount} colorClass="border-emerald-500/20" />
            <StatCard label="On Leave" value={onLeaveCount} colorClass="border-amber-500/20" />
            <StatCard label="Inactive / Other" value={inactiveCount} colorClass="border-slate-400/20" />
          </div>
        )}

        {/* ── Search & filter ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold border transition',
                  statusFilter === opt.value
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-border text-muted-foreground hover:border-emerald-500/50 hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Loading skeletons ────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <MemberCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────── */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">
                {members.length === 0 ? (
                  context === 'department' ? 'No colleagues in your department yet'
                  : context === 'both' ? 'No team members yet'
                  : 'No direct reports yet'
                ) : 'No results found'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {members.length === 0
                  ? context === 'department'
                    ? 'Other employees in your department will appear here.'
                    : context === 'both'
                      ? 'Your direct reports and department colleagues will appear here.'
                      : 'Employees assigned to you as reporting manager will appear here.'
                  : 'Try adjusting your search or filter.'}
              </p>
            </div>
            {members.length > 0 && search && (
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Clear search
              </Button>
            )}
          </div>
        )}

        {/* ── Team grid ────────────────────────────────────── */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((member) => (
              <MemberCard key={member.id} member={member} isDirectReport={directReportIds.has(member.id)} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
