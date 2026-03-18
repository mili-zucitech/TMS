import { useEffect, useMemo, useState } from 'react'
import { Users, UserPlus, RefreshCw, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '../hooks/useUsers'
import { UserTable } from '../components/UserTable'
import { UserSearchBar } from '../components/UserSearchBar'
import { UserFilters } from '../components/UserFilters'
import { UserCreateModal } from '../components/UserCreateModal'
import { UserEditModal } from '../components/UserEditModal'
import { UserDetailsDrawer } from '../components/UserDetailsDrawer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import type { UserResponse, UserCreateRequest, UserUpdateRequest } from '../types/user.types'
import departmentService from '../services/departmentService'
import type { DepartmentResponse } from '../types/user.types'

// ── Page ──────────────────────────────────────────────────────
export default function UserListPage() {
  const { user: authUser } = useAuth()
  const { users, isLoading, error, fetchUsers, createUser, updateUser, deactivateUser } =
    useUsers()

  // ── Departments ────────────────────────────────────────────
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  useEffect(() => {
    departmentService.getDepartments().then((p) => setDepartments(p.content)).catch(() => {})
  }, [])

  // Role-based access: ADMIN and HR can create/edit/deactivate
  const canModify =
    authUser?.roleName === 'ADMIN' || authUser?.roleName === 'HR'
  // Only ADMIN can deactivate
  const canDeactivate = authUser?.roleName === 'ADMIN'

  // ── Filter / search state ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // ── Modal / drawer state ───────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserResponse | null>(null)
  const [drawerUser, setDrawerUser] = useState<UserResponse | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<UserResponse | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  // ── Client-side filtered data ──────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.employeeId.toLowerCase().includes(q)
      const matchRole = !roleFilter || u.roleName === roleFilter
      const matchStatus = !statusFilter || u.status === statusFilter
      return matchSearch && matchRole && matchStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  // ── Handlers ──────────────────────────────────────────────
  const handleViewUser = (user: UserResponse) => {
    setDrawerUser(user)
    setDrawerOpen(true)
  }

  const handleEditUser = (user: UserResponse) => {
    setEditUser(user)
  }

  const handleDeactivateRequest = (user: UserResponse) => {
    setDeactivateTarget(user)
  }

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return
    setIsDeactivating(true)
    await deactivateUser(deactivateTarget.id)
    setIsDeactivating(false)
    setDeactivateTarget(null)
  }

  const handleCreateSubmit = async (data: UserCreateRequest): Promise<boolean> => {
    return createUser(data)
  }

  const handleUpdateSubmit = async (
    id: string,
    data: UserUpdateRequest,
  ): Promise<boolean> => {
    return updateUser(id, data)
  }

  const clearFilters = () => {
    setRoleFilter('')
    setStatusFilter('')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Page header ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading…'
                  : `${filteredUsers.length} of ${users.length} users`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => void fetchUsers()}
              disabled={isLoading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {canModify && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add User</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => void fetchUsers()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Search + Filters toolbar ───────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <UserSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            className="sm:flex-1"
          />
          <UserFilters
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            onRoleChange={setRoleFilter}
            onStatusChange={setStatusFilter}
            onClear={clearFilters}
          />
        </div>

        {/* ── Table ──────────────────────────────────────── */}
        <UserTable
          data={filteredUsers}
          isLoading={isLoading}
          departments={departments}
          users={users.map((u) => ({ id: u.id, name: u.name }))}
          canModify={canDeactivate ? canModify : canModify}
          onViewUser={handleViewUser}
          onEditUser={handleEditUser}
          onDeactivateUser={canDeactivate ? handleDeactivateRequest : () => {}}
        />
      </div>

      {/* ── Modals & Drawer ────────────────────────────────── */}
      <UserCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        departments={departments}
        users={users.map((u) => ({ id: u.id, name: u.name, employeeId: u.employeeId, roleName: u.roleName }))}
      />

      <UserEditModal
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditUser(null)
        }}
        user={editUser}
        onSubmit={handleUpdateSubmit}
        departments={departments}
        users={users.map((u) => ({ id: u.id, name: u.name, employeeId: u.employeeId, roleName: u.roleName }))}
      />

      <UserDetailsDrawer
        user={drawerUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={canModify ? handleEditUser : undefined}
        canModify={canModify}
        departments={departments}
        users={users.map((u) => ({ id: u.id, name: u.name, designation: u.designation }))}
      />

      {/* ── Deactivate confirmation dialog ─────────────────── */}
      <Dialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate User?</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-foreground">{deactivateTarget?.name}</span>?
              They will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isDeactivating}
              onClick={() => void handleConfirmDeactivate()}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
