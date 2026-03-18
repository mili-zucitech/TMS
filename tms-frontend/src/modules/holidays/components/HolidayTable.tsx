import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Search,
  Trash2,
  ChevronsUpDown,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import type { HolidayResponse, HolidayType } from '../types/holiday.types'
import { HOLIDAY_TYPE_CONFIG, HOLIDAY_TYPES } from './holidayConfig'

// ── Types ─────────────────────────────────────────────────────

interface HolidayTableProps {
  holidays: HolidayResponse[]
  canManage: boolean
  onEdit: (holiday: HolidayResponse) => void
  onDelete: (holiday: HolidayResponse) => void
}

type SortKey = 'name' | 'holidayDate' | 'type'
type SortDir = 'asc' | 'desc'

// ── Component ────────────────────────────────────────────────

export function HolidayTable({
  holidays,
  canManage,
  onEdit,
  onDelete,
}: HolidayTableProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<HolidayType | 'ALL'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('holidayDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return holidays
      .filter((h) => {
        const matchesSearch =
          h.name.toLowerCase().includes(q) ||
          (h.description ?? '').toLowerCase().includes(q)
        const matchesType = typeFilter === 'ALL' || h.type === typeFilter
        return matchesSearch && matchesType
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
        else if (sortKey === 'holidayDate')
          cmp = a.holidayDate.localeCompare(b.holidayDate)
        else if (sortKey === 'type') cmp = a.type.localeCompare(b.type)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [holidays, search, typeFilter, sortKey, sortDir])

  return (
    <div className="space-y-4">
      {/* ── Filters ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search holidays…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <TypeFilterButton
            value="ALL"
            current={typeFilter}
            onClick={() => setTypeFilter('ALL')}
          />
          {HOLIDAY_TYPES.map((t) => (
            <TypeFilterButton
              key={t}
              value={t}
              current={typeFilter}
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th
                  label="Holiday Name"
                  sortKey="name"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <Th
                  label="Date"
                  sortKey="holidayDate"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <Th
                  label="Type"
                  sortKey="type"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Description
                </th>
                {canManage && (
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 5 : 4}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No holidays found
                  </td>
                </tr>
              ) : (
                filtered.map((holiday) => (
                  <HolidayRow
                    key={holiday.id}
                    holiday={holiday}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {holidays.length} holidays
      </p>
    </div>
  )
}

// ── Helper components ────────────────────────────────────────

function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th
      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </span>
    </th>
  )
}

function TypeFilterButton({
  value,
  current,
  onClick,
}: {
  value: HolidayType | 'ALL'
  current: HolidayType | 'ALL'
  onClick: () => void
}) {
  const isActive = value === current
  const config = value !== 'ALL' ? HOLIDAY_TYPE_CONFIG[value] : null
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        isActive
          ? config
            ? config.badgeClass + ' ring-2 ring-offset-1'
            : 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground bg-background',
      )}
    >
      {value === 'ALL' ? 'All Types' : HOLIDAY_TYPE_CONFIG[value].label}
    </button>
  )
}

function HolidayRow({
  holiday,
  canManage,
  onEdit,
  onDelete,
}: {
  holiday: HolidayResponse
  canManage: boolean
  onEdit: (h: HolidayResponse) => void
  onDelete: (h: HolidayResponse) => void
}) {
  const config = HOLIDAY_TYPE_CONFIG[holiday.type]
  const formattedDate = formatDate(holiday.holidayDate)

  return (
    <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors last:border-0">
      <td className="px-4 py-3 font-medium">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2 w-2 rounded-full flex-shrink-0', config.dotClass)}
          />
          {holiday.name}
          {holiday.isOptional && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              OPTIONAL
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground tabular-nums">
        {formattedDate}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
            config.badgeClass,
          )}
        >
          {config.label}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground max-w-[250px] truncate">
        {holiday.description ?? '—'}
      </td>
      {canManage && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(holiday)}
              title="Edit holiday"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(holiday)}
              title="Delete holiday"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  )
}

// ── Date formatting ──────────────────────────────────────────

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
