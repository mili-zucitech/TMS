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
  Archive,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import type { ProjectResponse } from '../types/project.types'

// ── Sort header ───────────────────────────────────────────────────────────────

function SortHeader({
  column,
  label,
}: {
  column: Column<ProjectResponse, unknown>
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-1 group text-left"
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

// ── Date formatter helper ─────────────────────────────────────────────────────

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
  project: ProjectResponse
  canModify: boolean
  canArchive: boolean
  onEdit: (project: ProjectResponse) => void
  onArchive: (project: ProjectResponse) => void
  onView: (project: ProjectResponse) => void
  compact?: boolean
}

function ActionCell({
  project,
  canModify,
  canArchive,
  onEdit,
  onArchive,
  onView,
  compact,
}: ActionCellProps) {
  const isArchived =
    project.status === 'COMPLETED' || project.status === 'CANCELLED'
  return (
    <div
      className={cn('flex items-center', compact ? 'gap-0.5' : 'gap-1')}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onView(project)}
        title="View project"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {canModify && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(project)}
          title="Edit project"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {canArchive && !isArchived && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onArchive(project)}
          title="Archive project"
        >
          <Archive className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProjectTableProps {
  data: ProjectResponse[]
  isLoading: boolean
  canModify: boolean
  canArchive: boolean
  onEditProject: (project: ProjectResponse) => void
  onArchiveProject: (project: ProjectResponse) => void
}

// ── Column helper ─────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<ProjectResponse>()

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectTable({
  data,
  isLoading,
  canModify,
  canArchive,
  onEditProject,
  onArchiveProject,
}: ProjectTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])

  const handleViewProject = (project: ProjectResponse) => {
    navigate(`/projects/${project.id}`)
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('projectCode', {
        header: ({ column }) => (
          <SortHeader column={column} label="Code" />
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('name', {
        header: ({ column }) => (
          <SortHeader column={column} label="Project Name" />
        ),
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white select-none">
              {getValue().charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-medium leading-tight truncate">{getValue()}</p>
          </div>
        ),
      }),
      columnHelper.accessor('clientName', {
        header: 'Client',
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        enableSorting: false,
        cell: ({ getValue }) => <ProjectStatusBadge status={getValue()} />,
      }),
      columnHelper.accessor('startDate', {
        header: ({ column }) => (
          <SortHeader column={column} label="Start Date" />
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(getValue() ?? null)}
          </span>
        ),
      }),
      columnHelper.accessor('endDate', {
        header: ({ column }) => (
          <SortHeader column={column} label="End Date" />
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(getValue() ?? null)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <ActionCell
            project={row.original}
            canModify={canModify}
            canArchive={canArchive}
            onView={handleViewProject}
            onEdit={onEditProject}
            onArchive={onArchiveProject}
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canModify, canArchive, onEditProject, onArchiveProject],
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
      {/* ── Desktop table ──────────────────────────────────── */}
      <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-muted/40">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
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
                    No projects found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => handleViewProject(row.original)}
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

      {/* ── Mobile card layout ─────────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <CardSkeleton />
        ) : data.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No projects found</p>
        ) : (
          table.getRowModel().rows.map((row) => {
            const project = row.original
            return (
              <div
                key={row.id}
                className="rounded-xl border border-border bg-background p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleViewProject(project)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white select-none">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{project.name}</p>
                      <p className="font-mono text-xs text-primary">{project.projectCode}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <ActionCell
                      project={project}
                      canModify={canModify}
                      canArchive={canArchive}
                      onView={handleViewProject}
                      onEdit={onEditProject}
                      onArchive={onArchiveProject}
                      compact
                    />
                  </div>
                </div>

                {project.clientName && (
                  <p className="text-xs text-muted-foreground">
                    Client: <span className="font-medium text-foreground">{project.clientName}</span>
                  </p>
                )}

                {(project.startDate || project.endDate) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {formatDate(project.startDate ?? null)}
                      {' → '}
                      {formatDate(project.endDate ?? null)}
                    </span>
                  </div>
                )}

                <ProjectStatusBadge status={project.status} />
              </div>
            )
          })
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      {!isLoading && totalRows > 0 && (
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <span>
            {from}–{to} of {totalRows} projects
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs">
              Page {pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
