import { useCallback, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/Badge'

type SortDir = 'asc' | 'desc' | null

export interface Column<T> {
  key: keyof T & string
  header: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  render?: (value: T[keyof T], row: T) => React.ReactNode
  width?: string
}

interface ReportTableProps<T> {
  data: T[]
  columns: Column<T>[]
  caption?: string
  searchable?: boolean
  searchKeys?: (keyof T & string)[]
  className?: string
  emptyMessage?: string
}

export function ReportTable<T extends object>({
  data,
  columns,
  caption,
  searchable = false,
  searchKeys = [],
  className,
  emptyMessage = 'No data available',
}: ReportTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 15

  const handleSort = useCallback(
    (key: keyof T) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'))
        if (sortDir === 'desc') setSortKey(null)
      } else {
        setSortKey(key)
        setSortDir('asc')
      }
    },
    [sortKey, sortDir],
  )

  const filtered = useMemo(() => {
    if (!query.trim() || searchKeys.length === 0) return data
    const q = query.toLowerCase()
    return data.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
    )
  }, [data, query, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className={cn('space-y-3', className)}>
      {(searchable || caption) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {caption && (
            <p className="text-sm font-medium text-muted-foreground">{caption}</p>
          )}
          {searchable && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0) }}
                className="h-9 w-56 rounded-lg border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                  'px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap text-left',
                    col.align === 'right'  && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                  )}
                  onClick={col.sortable ? () => handleSort(col.key as keyof T) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 transition-colors hover:bg-muted/30 last:border-0"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm',
                        col.align === 'right'  && 'text-right tabular-nums',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key as keyof T], row)
                        : String(row[col.key as keyof T] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
              const idx = pageCount <= 7 ? i : page < 4 ? i : page > pageCount - 4 ? pageCount - 7 + i : page - 3 + i
              return (
                <button
                  key={idx}
                  onClick={() => setPage(idx)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs transition-colors',
                    idx === page
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {idx + 1}
                </button>
              )
            })}
            <button
              disabled={page === pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper: status badge renderer ─────────────────────────────────────────────
export function statusBadge(status: string) {
  const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    APPROVED: 'success',
    SUBMITTED: 'warning',
    PENDING: 'warning',
    REJECTED: 'destructive',
    DRAFT: 'secondary',
    LOCKED: 'secondary',
    CANCELLED: 'secondary',
  }
  return <Badge variant={map[status] ?? 'secondary'}>{status}</Badge>
}
