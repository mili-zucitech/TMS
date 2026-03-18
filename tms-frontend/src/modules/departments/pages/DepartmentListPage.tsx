import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  RefreshCw,
  AlertCircle,
  X,
  ChevronRight,
  UserPlus,
  UserMinus,
  Search,
} from 'lucide-react'
import type { AxiosError } from 'axios'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import departmentService from '../services/departmentService'
import userModuleService from '@/modules/users/services/userService'
import type {
  DepartmentDetail,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentMember,
} from '../types/department.types'
import type { UserResponse } from '@/modules/users/types/user.types'
import type { ApiResponse } from '@/types/api.types'

function getErrorMessage(err: unknown): string {
  const e = err as AxiosError<ApiResponse<unknown>>
  return e?.response?.data?.message ?? 'Something went wrong'
}

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
        ${status === 'ACTIVE'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}
    >
      {status}
    </span>
  )
}

// ── Create / Edit modal ───────────────────────────────────────

interface DeptFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  dept?: DepartmentDetail | null
}

function DeptFormModal({ open, onClose, onSaved, dept }: DeptFormModalProps) {
  const [name, setName] = useState(dept?.name ?? '')
  const [description, setDescription] = useState(dept?.description ?? '')
  const [status, setStatus] = useState<string>(dept?.status ?? 'ACTIVE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(dept?.name ?? '')
      setDescription(dept?.description ?? '')
      setStatus(dept?.status ?? 'ACTIVE')
      setError(null)
    }
  }, [open, dept])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      if (dept) {
        const body: DepartmentUpdateRequest = { name: name.trim(), description, status: status as 'ACTIVE' | 'INACTIVE' }
        await departmentService.update(dept.id, body)
      } else {
        const body: DepartmentCreateRequest = { name: name.trim(), description }
        await departmentService.create(body)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-semibold">
              {dept ? 'Edit Department' : 'New Department'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of this department…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {dept && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : dept ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Members drawer ────────────────────────────────────────────

interface MembersDrawerProps {
  dept: DepartmentDetail | null
  onClose: () => void
  onRefresh: () => void
  canModify: boolean
}

function MembersDrawer({ dept, onClose, onRefresh, canModify }: MembersDrawerProps) {
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [allUsers, setAllUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<UserResponse[]>([])
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Load current members + full user list
  useEffect(() => {
    if (!dept) return
    setLoading(true)
    setSelectedUsers([])
    setSearchQuery('')
    setAddError(null)
    Promise.all([
      departmentService.getMembers(dept.id),
      userModuleService.getUsers(0, 500).then((p) => p.content),
    ])
      .then(([mem, users]) => {
        setMembers(mem)
        setAllUsers(users)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dept])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filter: matches name or employeeId, not already a member, not already selected
  // Must be before any early return to satisfy Rules of Hooks
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const memberIds = new Set(members.map((m) => m.id))
    const selectedIds = new Set(selectedUsers.map((u) => u.id))
    return allUsers.filter(
      (u) =>
        !memberIds.has(u.id) &&
        !selectedIds.has(u.id) &&
        (u.name.toLowerCase().includes(q) || u.employeeId.toLowerCase().includes(q)),
    )
  }, [searchQuery, allUsers, members, selectedUsers])

  if (!dept) return null

  const handleSelectUser = (user: UserResponse) => {
    setSelectedUsers((prev) => [...prev, user])
    setSearchQuery('')
    setDropdownOpen(false)
    setAddError(null)
  }

  const handleDeselectUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleAdd = async () => {
    if (!selectedUsers.length) { setAddError('Select at least one user to add'); return }
    setAdding(true)
    setAddError(null)
    try {
      await departmentService.addMembers(dept.id, { userIds: selectedUsers.map((u) => u.id) })
      const updated = await departmentService.getMembers(dept.id)
      setMembers(updated)
      setSelectedUsers([])
      onRefresh()
    } catch (err) {
      const e = err as AxiosError<ApiResponse<unknown>>
      setAddError(e?.response?.data?.message ?? 'Failed to add members')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (userId: string) => {
    setRemovingId(userId)
    try {
      await departmentService.removeMember(dept.id, userId)
      setMembers((prev) => prev.filter((m) => m.id !== userId))
      onRefresh()
    } catch {
      // no-op
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="fixed h-full inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-semibold">{dept.name}</h3>
            <p className="text-xs text-muted-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add members — search by name / employee ID */}
        {canModify && (
          <div className="border-b border-border px-5 py-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Add Members
            </p>

            {/* Search input with dropdown */}
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setDropdownOpen(true)
                  }}
                  onFocus={() => searchQuery && setDropdownOpen(true)}
                  placeholder="Search by name or employee ID…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setDropdownOpen(false) }}>
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Dropdown results */}
              {dropdownOpen && filteredUsers.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onMouseDown={() => handleSelectUser(u)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.employeeId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {dropdownOpen && searchQuery.trim() && filteredUsers.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-border bg-popover px-4 py-3 shadow-lg">
                  <p className="text-sm text-muted-foreground">No users found</p>
                </div>
              )}
            </div>

            {/* Selected chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                  >
                    {u.name}
                    <button onClick={() => handleDeselectUser(u.id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}

            <Button
              size="sm"
              className="w-full"
              onClick={handleAdd}
              disabled={adding || selectedUsers.length === 0}
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              {adding ? 'Adding…' : `Add ${selectedUsers.length > 0 ? selectedUsers.length : ''} Member${selectedUsers.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}

        {/* Member list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Users className="h-8 w-8 opacity-40" />
              <p className="text-sm">No members yet</p>
            </div>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.employeeId} {m.designation ? `· ${m.designation}` : ''}
                    </p>
                  </div>
                </div>
                {canModify && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={removingId === m.id}
                    className="ml-2 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 disabled:opacity-50"
                    title="Remove from department"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function DepartmentListPage() {
  const { user: authUser } = useAuth()
  const canModify =
    authUser?.roleName === 'ADMIN' || authUser?.roleName === 'HR_MANAGER'
  const canDelete = authUser?.roleName === 'ADMIN'

  const [departments, setDepartments] = useState<DepartmentDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [editDept, setEditDept] = useState<DepartmentDetail | null>(null)
  const [membersDept, setMembersDept] = useState<DepartmentDetail | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await departmentService.getAll(0, 100)
      setDepartments(page.content)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleDelete = async (dept: DepartmentDetail) => {
    if (!window.confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return
    setDeletingId(dept.id)
    try {
      await departmentService.deleteDepartment(dept.id)
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id))
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Departments</h1>
            <p className="text-sm text-muted-foreground">
              {departments.length} department{departments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canModify && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Department
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" onClick={fetchAll} className="ml-auto">Retry</Button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="font-medium">No departments yet</p>
          {canModify && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create first department
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Status */}
              <div className="absolute right-4 top-4">
                <StatusBadge status={dept.status} />
              </div>

              {/* Icon + name */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                  <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold pr-16">{dept.name}</h3>
                  {dept.headName && (
                    <p className="truncate text-xs text-muted-foreground">
                      Head: {dept.headName}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {dept.description && (
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {dept.description}
                </p>
              )}

              {/* Member count */}
              <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                <button
                  onClick={() => setMembersDept(dept)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  {dept.memberCount} member{dept.memberCount !== 1 ? 's' : ''}
                  <ChevronRight className="h-3 w-3" />
                </button>

                {/* Actions */}
                {canModify && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditDept(dept)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edit department"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(dept)}
                        disabled={deletingId === dept.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete department"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <DeptFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={fetchAll}
      />
      <DeptFormModal
        open={!!editDept}
        dept={editDept}
        onClose={() => setEditDept(null)}
        onSaved={fetchAll}
      />
      <MembersDrawer
        dept={membersDept}
        onClose={() => setMembersDept(null)}
        onRefresh={fetchAll}
        canModify={canModify}
      />
    </div>
  )
}
