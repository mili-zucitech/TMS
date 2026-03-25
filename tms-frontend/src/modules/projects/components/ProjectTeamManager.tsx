import { useState, useMemo, useRef, useEffect } from 'react'
import { UserPlus, UserMinus, Search, Users, X } from 'lucide-react'

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
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null)
  const [selectedRole, setSelectedRole] = useState<ProjectRole | ''>('')
  const [allocation, setAllocation] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Combobox state
  const [userSearch, setUserSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Users not yet assigned, filtered to the project's department when set
  const assignedUserIds = useMemo(
    () => new Set(assignments.map((a) => a.userId)),
    [assignments],
  )
  const availableUsers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          !assignedUserIds.has(u.id) &&
          (departmentId == null || u.departmentId === departmentId),
      ),
    [allUsers, assignedUserIds, departmentId],
  )

  // Filter available users by search query
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
    if (!selectedUser) return
    setAssigning(true)
    const payload: ProjectAssignmentRequest = {
      projectId,
      userId: selectedUser.id,
      ...(selectedRole ? { role: selectedRole } : {}),
      ...(allocation ? { allocationPercentage: parseInt(allocation, 10) } : {}),
    }
    const ok = await assignUser(payload)
    if (ok) {
      setSelectedUser(null)
      setSelectedRole('')
      setAllocation('')
      setUserSearch('')
    }
    setAssigning(false)
  }

  // Build a lookup map: userId → UserResponse (for current team display)
  const userMap = useMemo(
    () => Object.fromEntries(allUsers.map((u) => [u.id, u])),
    [allUsers],
  )

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* ── Employee combobox ───────────────────────── */}
            <div className="space-y-1.5 sm:col-span-1" ref={comboboxRef}>
              <Label>Employee</Label>
              <div className="relative">
                {/* Input shows selected name or search query */}
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search employees…"
                  value={selectedUser ? selectedUser.name : userSearch}
                  onChange={(e) => {
                    setSelectedUser(null)
                    setUserSearch(e.target.value)
                    setDropdownOpen(true)
                  }}
                  onFocus={() => { if (!selectedUser) setDropdownOpen(true) }}
                  className={`${selectClass} pl-9 pr-8 cursor-text`}
                  readOnly={!!selectedUser}
                  aria-label="Search employee"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="listbox"
                />
                {/* Clear button */}
                {(selectedUser || userSearch) && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setSelectedUser(null)
                      setUserSearch('')
                      setDropdownOpen(false)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Dropdown */}
                {dropdownOpen && !selectedUser && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-white shadow-lg dark:bg-card"
                  >
                    {filteredAvailable.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-muted-foreground text-center">
                        {availableUsers.length === 0 ? 'All employees already assigned' : 'No matches found'}
                      </p>
                    ) : (
                      filteredAvailable.map((u: UserResponse) => (
                        <button
                          key={u.id}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setSelectedUser(u)
                            setUserSearch('')
                            setDropdownOpen(false)
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white select-none">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.employeeId} · {u.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
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
            disabled={!selectedUser || assigning}
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
