import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { HolidayResponse } from '../types/holiday.types'
import { HOLIDAY_TYPE_CONFIG } from './holidayConfig'

// ── Types ─────────────────────────────────────────────────────

interface HolidayCalendarProps {
  holidays: HolidayResponse[]
  canManage: boolean
  onEdit: (holiday: HolidayResponse) => void
  onDelete: (holiday: HolidayResponse) => void
}

// ── Constants ────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Component ────────────────────────────────────────────────

export function HolidayCalendar({
  holidays,
  canManage,
  onEdit,
  onDelete,
}: HolidayCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-based
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayResponse | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Map "YYYY-MM-DD" → holidays on that day
  const holidayMap = useMemo(() => {
    const map = new Map<string, HolidayResponse[]>()
    for (const h of holidays) {
      const existing = map.get(h.holidayDate) ?? []
      map.set(h.holidayDate, [...existing, h])
    }
    return map
  }, [holidays])

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const goToToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  // Build calendar grid cells
  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth])

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToPrev} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNext} className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        {(Object.entries(HOLIDAY_TYPE_CONFIG) as [string, typeof HOLIDAY_TYPE_CONFIG[keyof typeof HOLIDAY_TYPE_CONFIG]][]).map(
          ([type, cfg]) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('h-2.5 w-2.5 rounded-full', cfg.dotClass)} />
              {cfg.label}
            </span>
          ),
        )}
      </div>

      {/* ── Calendar Grid ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const isoDate = cell ? toIso(cell.year, cell.month, cell.day) : null
            const dayHolidays = isoDate ? (holidayMap.get(isoDate) ?? []) : []
            const isToday =
              cell?.year === today.getFullYear() &&
              cell?.month === today.getMonth() &&
              cell?.day === today.getDate()
            const isCurrentMonth = cell?.month === viewMonth

            return (
              <CalendarCell
                key={idx}
                cell={cell}
                isToday={isToday}
                isCurrentMonth={isCurrentMonth}
                holidays={dayHolidays}
                onSelectHoliday={setSelectedHoliday}
              />
            )
          })}
        </div>
      </div>

      {/* ── Holiday Detail Popup ────────────────────────────── */}
      {selectedHoliday && (
        <HolidayDetailPopup
          holiday={selectedHoliday}
          canManage={canManage}
          onEdit={() => { onEdit(selectedHoliday); setSelectedHoliday(null) }}
          onDelete={() => { onDelete(selectedHoliday); setSelectedHoliday(null) }}
          onClose={() => setSelectedHoliday(null)}
          ref={popupRef}
        />
      )}
    </div>
  )
}

// ── Calendar Cell ─────────────────────────────────────────────

interface CellData { year: number; month: number; day: number }

function CalendarCell({
  cell,
  isToday,
  isCurrentMonth,
  holidays,
  onSelectHoliday,
}: {
  cell: CellData | null
  isToday: boolean
  isCurrentMonth: boolean
  holidays: HolidayResponse[]
  onSelectHoliday: (h: HolidayResponse) => void
}) {
  return (
    <div
      className={cn(
        'min-h-[100px] p-2 border-b border-r border-border/60 last:border-r-0',
        'transition-colors',
        !isCurrentMonth && 'bg-muted/20',
        isToday && 'bg-primary/5',
      )}
    >
      {cell && (
        <>
          <div className="flex justify-end mb-1">
            <span
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded-full text-sm font-medium',
                isToday
                  ? 'bg-primary text-primary-foreground font-bold'
                  : isCurrentMonth
                  ? 'text-foreground'
                  : 'text-muted-foreground/50',
              )}
            >
              {cell.day}
            </span>
          </div>

          <div className="space-y-0.5">
            {holidays.slice(0, 2).map((h) => (
              <HolidayChip
                key={h.id}
                holiday={h}
                onClick={() => onSelectHoliday(h)}
              />
            ))}
            {holidays.length > 2 && (
              <button
                className="w-full text-left text-[10px] font-medium text-muted-foreground pl-1 hover:text-foreground transition-colors"
                onClick={() => onSelectHoliday(holidays[2])}
              >
                +{holidays.length - 2} more
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Holiday Chip ─────────────────────────────────────────────

function HolidayChip({
  holiday,
  onClick,
}: {
  holiday: HolidayResponse
  onClick: () => void
}) {
  const config = HOLIDAY_TYPE_CONFIG[holiday.type]
  return (
    <button
      onClick={onClick}
      title={holiday.description ?? holiday.name}
      className={cn(
        'w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium',
        'transition-opacity hover:opacity-80',
        config.badgeClass,
      )}
    >
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle', config.dotClass)} />
      {holiday.name}
    </button>
  )
}

// ── Holiday Detail Popup ──────────────────────────────────────

import { forwardRef } from 'react'

const HolidayDetailPopup = forwardRef<
  HTMLDivElement,
  {
    holiday: HolidayResponse
    canManage: boolean
    onEdit: () => void
    onDelete: () => void
    onClose: () => void
  }
>(({ holiday, canManage, onEdit, onDelete, onClose }, ref) => {
  const config = HOLIDAY_TYPE_CONFIG[holiday.type]
  const formattedDate = formatDate(holiday.holidayDate)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={ref}
        className={cn(
          'relative z-50 w-full max-w-sm rounded-2xl border border-border',
          'bg-background shadow-2xl p-5 space-y-4',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Type badge */}
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
            config.badgeClass,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', config.dotClass)} />
          {config.label}
          {holiday.isOptional && (
            <span className="ml-1.5 text-[10px] font-normal opacity-70">• Optional</span>
          )}
        </span>

        {/* Title */}
        <div>
          <h3 className="text-lg font-semibold leading-tight">{holiday.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>

        {/* Description */}
        {holiday.description && (
          <p className="text-sm text-muted-foreground border-t border-border pt-3">
            {holiday.description}
          </p>
        )}

        {/* Actions */}
        {canManage && (
          <div className="flex gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})
HolidayDetailPopup.displayName = 'HolidayDetailPopup'

// ── Helpers ──────────────────────────────────────────────────

function buildCalendarCells(year: number, month: number): (CellData | null)[] {
  const firstDay = new Date(year, month, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (CellData | null)[] = []

  // Leading empty cells from previous month
  const prevMonthDays = new Date(year, month, 0).getDate()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ year: prevYear, month: prevMonth, day: prevMonthDays - i })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d })
  }

  // Trailing cells to fill last row
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ year: nextYear, month: nextMonth, day: nextDay++ })
  }

  return cells
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
