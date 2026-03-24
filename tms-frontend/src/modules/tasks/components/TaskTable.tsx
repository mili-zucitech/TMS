import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { TaskStatusBadge } from './TaskStatusBadge'
import { TaskPriorityBadge } from './TaskPriorityBadge'
import type { TaskResponse } from '../types/task.types'

// ── Sort header ───────────────────────────────────────────────────────────────
function SortHeader({
  column,
  label,
}: {
  column: Column<TaskResponse, unknown>
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-1 group text-left whitespace-nowrap"
    >
      {label}
      <span className="text-muted-foreground/60 group-hover:text-muted-foreground">
        {sorted === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : sorted === 'desc' ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Action cell ───────────────────────────────────────────────────────────────
interface ActionCellProps {
  task: TaskResponse
  canModify: boolean
  canDelete: boolean
  onEdit: (task: TaskResponse) => void
  onDelete: (task: TaskResponse) => void
  onView: (task: TaskResponse) => void
  compact?: boolean
}

function ActionCell({
  task,
  canModify,
  canDelete,
  onEdit,
  onDelete,
  onView,
  compact,
}: ActionCellProps) {
  return (
    <div
      className={cn('flex items-center', compact ? 'gap-0.5' : 'gap-1')}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onView(task)}
        title="View task"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {canModify && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(task)}
          title="Edit task"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(task)}
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface TaskTableProps {
  data: TaskResponse[]
  isLoading: boolean
  canModify: boolean
  canDelete: boolean
  projectNames: Record<number, string>
  userNames: Record<string, string>
  onEditTask: (task: TaskResponse) => void
  onDeleteTask: (task: TaskResponse) => void
}

const columnHelper = createColumnHelper<TaskResponse>()

// ── Component ─────────────────────────────────────────────────────────────────
export function TaskTable({
  data,
  isLoading,
  canModify,
  canDelete,
  projectNames,
  userNames,
  onEditTask,
  onDeleteTask,
}: TaskTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: ({ column }) => <SortHeader column={column} label="Task Name" />,
        cell: (info) => (
          <div className="min-w-0">
            <p className="font-medium text-sm truncate max-w-[240px]">{info.getValue()}</p>
            <p className="text-xs text-muted-foreground font-mono">{info.row.original.taskCode}</p>
          </div>
        ),
      }),
      columnHelper.accessor('projectId', {
        header: ({ column }) => <SortHeader column={column} label="Project" />,
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {projectNames[info.getValue()] ?? `#${info.getValue()}`}
          </span>
        ),
      }),
      columnHelper.accessor('assignedUserId', {
        header: 'Assigned To',
        cell: (info) => {
          const uid = info.getValue()
          return (
            <span className="text-sm text-muted-foreground">
              {uid ? (userNames[uid] ?? 'Loading…') : <span className="italic">Unassigned</span>}
            </span>
          )
        },
      }),
      columnHelper.accessor('priority', {
        header: ({ column }) => <SortHeader column={column} label="Priority" />,
        cell: (info) => <TaskPriorityBadge priority={info.getValue()} />,
      }),
      columnHelper.accessor('status', {
        header: ({ column }) => <SortHeader column={column} label="Status" />,
        cell: (info) =>
          <TaskStatusBadge status={info.getValue()} />
      }),
      columnHelper.accessor('dueDate', {
        header: ({ column }) => <SortHeader column={column} label="Due Date" />,
        cell: (info) => {
          const dateStr = info.getValue()
          const isOverdue =
            dateStr &&
            info.row.original.status !== 'COMPLETED' &&
            new Date(dateStr) < new Date()
          return (
            <span
              className={cn(
                'flex items-center gap-1.5 text-sm whitespace-nowrap',
                isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
              )}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatDate(dateStr)}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => (
          <ActionCell
            task={info.row.original}
            canModify={canModify}
            canDelete={canDelete}
            onView={(t) => navigate(`/tasks/${t.id}`)}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ),
      }),
    ],
    [canModify, canDelete, projectNames, userNames, navigate, onEditTask, onDeleteTask],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <p className="font-medium">No tasks found</p>
        <p className="text-sm">Try adjusting your search or filters.</p>
      </div>
    )
  }

  // ── Mobile card layout ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-muted/40">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tasks/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
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

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <CardSkeleton />
        ) : (
          table.getRowModel().rows.map((row) => {
            const task = row.original
            return (
              <div
                key={task.id}
                className="rounded-xl border border-border p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {task.taskCode}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <TaskPriorityBadge priority={task.priority} />
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {projectNames[task.projectId] ?? `Project #${task.projectId}`}
                  </span>
                  <ActionCell
                    task={task}
                    canModify={canModify}
                    canDelete={canDelete}
                    onView={(t) => navigate(`/tasks/${t.id}`)}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    compact
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {!isLoading && data.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ·{' '}
            {data.length} tasks
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
