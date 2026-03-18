import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type Column,
} from '@tanstack/react-table'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Pencil,
  UserMinus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { RoleName, UserResponse, UserStatus } from '../types/user.types'

// ── Badge helpers ─────────────────────────────────────────────────────────────

const roleBadgeClass: Record<RoleName, string> = {
  ADMIN:
    'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20',
  HR: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  HR_MANAGER:
    'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20',
  MANAGER:
    'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20',
  DIRECTOR:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  EMPLOYEE:
    'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20',
}

const statusBadgeClass: Record<UserStatus, string> = {
  ACTIVE:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  INACTIVE:
    'bg-slate-400/10 text-slate-600 dark:text-slate-400 border border-slate-400/20',
  ON_LEAVE:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  SUSPENDED:
    'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',
  TERMINATED:
    'bg-rose-900/10 text-rose-800 dark:text-rose-300 border border-rose-900/20',
}

const statusLabel: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
}

const roleLabel: Record<RoleName, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  HR_MANAGER: 'HR Manager',
  MANAGER: 'Manager',
  DIRECTOR: 'Director',
  EMPLOYEE: 'Employee',
}

function RoleBadge({ role }: { role: RoleName }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-nowrap',
        roleBadgeClass[role],
      )}
    >
      {roleLabel[role]}
    </span>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        statusBadgeClass[status],
      )}
    >
      {statusLabel[status]}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full animate-pulse bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </>
  )
}

// ── Column definition ─────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<UserResponse>()

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserTableProps {
  data: UserResponse[]
  isLoading: boolean
  canModify: boolean
  departments?: { id: number; name: string }[]
  users?: { id: string; name: string }[]
  onViewUser: (user: UserResponse) => void
  onEditUser: (user: UserResponse) => void
  onDeactivateUser: (user: UserResponse) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserTable({
  data,
  isLoading,
  canModify,
  departments = [],
  users = [],
  onViewUser,
  onEditUser,
  onDeactivateUser,
}: UserTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(
    () => [
      columnHelper.accessor('employeeId', {
        header: ({ column }) => (
          <SortHeader column={column} label="Emp. ID" />
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('name', {
        header: ({ column }) => <SortHeader column={column} label="Name" />,
        cell: ({ getValue, row }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white select-none">
              {getValue().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight truncate">{getValue()}</p>
              <p className="text-xs text-muted-foreground truncate">
                {row.original.designation ?? '—'}
              </p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('email', {
        header: ({ column }) => <SortHeader column={column} label="Email" />,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.accessor('departmentId', {
        header: 'Department',
        enableSorting: false,
        cell: ({ getValue }) => {
          const v = getValue()
          if (v == null) return <span className="text-sm text-muted-foreground">—</span>
          const dept = departments.find((d) => d.id === v)
          return (
            <span className="text-sm text-muted-foreground">
              {dept?.name ?? `Dept. ${v}`}
            </span>
          )
        },
      }),
      columnHelper.accessor('managerId', {
        header: 'Reporting Manager',
        enableSorting: false,
        cell: ({ getValue }) => {
          const v = getValue()
          if (v == null) return <span className="text-sm text-muted-foreground">—</span>
          const mgr = users.find((u) => u.id === v)
          return (
            <span className="text-sm text-muted-foreground">
              {mgr?.name ?? '—'}
            </span>
          )
        },
      }),
      columnHelper.accessor('roleName', {
        header: 'Role',
        enableSorting: false,
        cell: ({ getValue }) => <RoleBadge role={getValue()} />,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <ActionCell
            user={row.original}
            canModify={canModify}
            onView={onViewUser}
            onEdit={onEditUser}
            onDeactivate={onDeactivateUser}
          />
        ),
      }),
    ],
    [canModify, departments, users, onViewUser, onEditUser, onDeactivateUser],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = data.length
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="space-y-4">
      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-muted/40">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onViewUser(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile card layout ────────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <CardSkeleton />
        ) : data.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No users found</p>
        ) : (
          table.getRowModel().rows.map((row) => {
            const user = row.original
            return (
              <div
                key={row.id}
                className="rounded-xl border border-border bg-background p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onViewUser(user)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white select-none">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionCell
                      user={user}
                      canModify={canModify}
                      onView={onViewUser}
                      onEdit={onEditUser}
                      onDeactivate={onDeactivateUser}
                      compact
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-primary">{user.employeeId}</span>
                  <span className="text-border">·</span>
                  <span>{user.designation ?? '—'}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <RoleBadge role={user.roleName} />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────── */}
      {!isLoading && totalRows > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground order-2 sm:order-1">
            Showing {from}–{to} of {totalRows} users
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SortHeader sub-component ──────────────────────────────────────────────────

function SortHeader({ column, label }: { column: Column<UserResponse, unknown>; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      className="inline-flex items-center gap-1 group"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <ChevronUp className="h-3.5 w-3.5 text-primary" />
      ) : sorted === 'desc' ? (
        <ChevronDown className="h-3.5 w-3.5 text-primary" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
      )}
    </button>
  )
}

// ── ActionCell sub-component ──────────────────────────────────────────────────

interface ActionCellProps {
  user: UserResponse
  canModify: boolean
  onView: (u: UserResponse) => void
  onEdit: (u: UserResponse) => void
  onDeactivate: (u: UserResponse) => void
  compact?: boolean
}

function ActionCell({ user, canModify, onView, onEdit, onDeactivate, compact }: ActionCellProps) {
  return (
    <div
      className={cn('flex items-center gap-1', compact ? 'flex-col' : '')}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onView(user)}
        title="View details"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {canModify && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(user)}
            title="Edit user"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {user.status !== 'TERMINATED' && user.status !== 'INACTIVE' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDeactivate(user)}
              title="Deactivate user"
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  )
}

// ── re-export helpers for use in other parts of the module ────────────────────
export { RoleBadge, StatusBadge, roleBadgeClass, statusBadgeClass, roleLabel, statusLabel }
