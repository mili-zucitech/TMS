import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { LeaveRequestResponse, LeaveStatus } from '../types/leave.types'
import { LEAVE_STATUS_CONFIG, LEAVE_STATUS_CAL_COLOR } from './leaveConfig'

// ── Types ─────────────────────────────────────────────────────

interface LeaveCalendarProps {
  leaves: LeaveRequestResponse[]
  onSelect?: (leave: LeaveRequestResponse) => void
}

// ── Constants ────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Component ────────────────────────────────────────────────

export function LeaveCalendar({ leaves, onSelect }: LeaveCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }
  const goToToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }

  // Which ISO dates fall within a leave request's range
  const dateLeaveMap = useMemo(() => {
    const map = new Map<string, LeaveRequestResponse[]>()
    for (const leave of leaves) {
      if (leave.status === 'CANCELLED' || leave.status === 'REJECTED') continue
      const start = new Date(leave.startDate)
      const end = new Date(leave.endDate)
      const cur = new Date(start)
      while (cur <= end) {
        const key = toIso(cur)
        map.set(key, [...(map.get(key) ?? []), leave])
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [leaves])

  const cells = useMemo(() => buildCells(viewYear, viewMonth), [viewYear, viewMonth])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goToPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(['PENDING', 'APPROVED'] as LeaveStatus[]).map((s) => {
          const cfg = LEAVE_STATUS_CONFIG[s]
          return (
            <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('h-2.5 w-2.5 rounded-full', cfg.dotClass)} />
              {cfg.label}
            </span>
          )
        })}
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const isoDate = cell ? toIso(new Date(cell.year, cell.month, cell.day)) : null
            const dayLeaves = isoDate ? (dateLeaveMap.get(isoDate) ?? []) : []
            const isToday = cell?.year === today.getFullYear() && cell?.month === today.getMonth() && cell?.day === today.getDate()
            const isCurrent = cell?.month === viewMonth
            return (
              <CalCell
                key={idx}
                cell={cell}
                isToday={isToday}
                isCurrentMonth={isCurrent}
                leaves={dayLeaves}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Calendar Cell ─────────────────────────────────────────────

interface CellData { year: number; month: number; day: number }

function CalCell({
  cell, isToday, isCurrentMonth, leaves, onSelect,
}: {
  cell: CellData | null
  isToday: boolean
  isCurrentMonth: boolean
  leaves: LeaveRequestResponse[]
  onSelect?: (l: LeaveRequestResponse) => void
}) {
  return (
    <div
      className={cn(
        'min-h-[90px] p-1.5 border-b border-r border-border/60 last:border-r-0',
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
                  : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
              )}
            >
              {cell.day}
            </span>
          </div>
          <div className="space-y-0.5">
            {leaves.slice(0, 2).map((l) => (
              <button
                key={l.id}
                onClick={() => onSelect?.(l)}
                title={`${l.leaveTypeName} — ${LEAVE_STATUS_CONFIG[l.status].label}`}
                className="w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: LEAVE_STATUS_CAL_COLOR[l.status] + '20',
                  color: LEAVE_STATUS_CAL_COLOR[l.status],
                  border: `1px solid ${LEAVE_STATUS_CAL_COLOR[l.status]}40`,
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle"
                  style={{ backgroundColor: LEAVE_STATUS_CAL_COLOR[l.status] }}
                />
                {l.leaveTypeName}
              </button>
            ))}
            {leaves.length > 2 && (
              <button
                className="w-full text-left text-[10px] font-medium text-muted-foreground pl-1 hover:text-foreground"
                onClick={() => onSelect?.(leaves[2])}
              >
                +{leaves.length - 2} more
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function buildCells(year: number, month: number): (CellData | null)[] {
  const firstWeekDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year

  const cells: CellData[] = []
  for (let i = firstWeekDay - 1; i >= 0; i--) {
    cells.push({ year: prevYear, month: prevMonth, day: prevMonthDays - i })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d })
  }
  let nd = 1
  while (cells.length % 7 !== 0) {
    cells.push({ year: nextYear, month: nextMonth, day: nd++ })
  }
  return cells
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
