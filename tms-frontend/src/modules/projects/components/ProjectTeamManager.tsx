import { useState, useMemo } from 'react'
import { UserPlus, UserMinus, Search, Users } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { UserResponse } from '@/modules/users/types/user.types'
import { useProjectAssignments } from '../hooks/useProjectAssignments'
import type { ProjectAssignmentRequest, ProjectRole } from '../types/project.types'

// ── Role options ───────────────────────────────────────────────────────────────

const PROJECT_ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'TECH_LEAD', label: 'Tech Lead' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'TESTER', label: 'Tester' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'BUSINESS_ANALYST', label: 'Business Analyst' },
  { value: 'DEVOPS', label: 'DevOps' },
  { value: 'CONSULTANT', label: 'Consultant' },
]

const roleLabel: Record<ProjectRole, string> = Object.fromEntries(
  PROJECT_ROLES.map(({ value, label }) => [value, label]),
) as Record<ProjectRole, string>

const selectClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-1 transition-colors disabled:opacity-50'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProjectTeamManagerProps {
  projectId: number
  departmentId: number | null
  allUsers: UserResponse[]
  canManageTeam: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectTeamManager({
  projectId,
  departmentId,
  allUsers,
  canManageTeam,
}: ProjectTeamManagerProps) {
  const { assignments, isLoading, assignUser, removeAssignment } =
    useProjectAssignments(projectId)

  // Assign-user form state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectRole | ''>('')
  const [allocation, setAllocation] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  // Build a lookup map: userId → UserResponse
  const userMap = useMemo(
    () => Object.fromEntries(allUsers.map((u) => [u.id, u])),
    [allUsers],
  )

  // Users not yet assigned, filtered to the project's department when set
  const assignedUserIds = new Set(assignments.map((a) => a.userId))
  const availableUsers = allUsers.filter(
    (u) =>
      !assignedUserIds.has(u.id) &&
      (departmentId == null || u.departmentId === departmentId),
  )

  // Filter available users by search
  const filteredAvailable = useMemo(() => {
    if (!userSearch.trim()) return availableUsers
    const q = userSearch.toLowerCase()
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.employeeId.toLowerCase().includes(q),
    )
  }, [availableUsers, userSearch])

  const handleAssign = async () => {
    if (!selectedUserId) return
    setAssigning(true)
    const payload: ProjectAssignmentRequest = {
      projectId,
      userId: selectedUserId,
      ...(selectedRole ? { role: selectedRole } : {}),
      ...(allocation ? { allocationPercentage: parseInt(allocation, 10) } : {}),
    }
    const ok = await assignUser(payload)
    if (ok) {
      setSelectedUserId('')
      setSelectedRole('')
      setAllocation('')
      setUserSearch('')
    }
    setAssigning(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Current team ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Team Members
            {assignments.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                ({assignments.length})
              </span>
            )}
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
            No team members assigned yet
          </p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {assignments.map((a) => {
              const member = userMap[a.userId]
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white select-none">
                      {(member?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {member?.name ?? a.userId}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {a.role && (
                          <span className="text-xs text-muted-foreground">
                            {roleLabel[a.role]}
                          </span>
                        )}
                        {a.allocationPercentage != null && (
                          <span className="text-xs text-muted-foreground">
                            · {a.allocationPercentage}% allocation
                          </span>
                        )}
                        {member?.email && (
                          <span className="text-xs text-muted-foreground truncate">
                            · {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canManageTeam && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAssignment(a.id)}
                      title="Remove from project"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Assign new member ─────────────────────────────── */}
      {canManageTeam && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Add Team Member</h3>
          </div>

          {/* Search available users */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search employees…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Employee selector */}
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Employee</Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={selectClass}
                aria-label="Select employee"
              >
                <option value="">— Select employee —</option>
                {filteredAvailable.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.employeeId})
                  </option>
                ))}
              </select>
            </div>

            {/* Role selector */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ProjectRole | '')}
                className={selectClass}
                aria-label="Select role"
              >
                <option value="">— Select role —</option>
                {PROJECT_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Allocation */}
            <div className="space-y-1.5">
              <Label>Allocation %</Label>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="100"
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleAssign}
            disabled={!selectedUserId || assigning}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-2"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {assigning ? 'Assigning…' : 'Assign to Project'}
          </Button>
        </div>
      )}
    </div>
  )
}
