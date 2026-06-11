import type { TimesheetFilterParams } from '../types/timesheet.types'
import { AppSelect } from '@/components/ui/Select'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Returns the Monday (ISO) of the given ISO week number in the given year. */
function isoWeekMonday(year: number, week: number): Date {
  // ISO week 1 always contains Jan 4; find its Monday.
  const jan4 = new Date(year, 0, 4)
  const jan4DayOfWeek = jan4.getDay() || 7 // Convert Sunday (0) → 7
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - jan4DayOfWeek + 1)
  const result = new Date(week1Monday)
  result.setDate(week1Monday.getDate() + (week - 1) * 7)
  return result
}

/** Returns the number of ISO weeks in the given year (52 or 53). */
function isoWeeksInYear(year: number): number {
  const jan1DayOfWeek = new Date(year, 0, 1).getDay() || 7
  const dec31DayOfWeek = new Date(year, 11, 31).getDay() || 7
  return jan1DayOfWeek === 4 || dec31DayOfWeek === 4 ? 53 : 52
}

function formatShort(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

export interface TimesheetFiltersProps {
  filters: { year: number } & TimesheetFilterParams
  onChange: (filters: { year: number } & TimesheetFilterParams) => void
  className?: string
}

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - 3 + i).reverse()

export function TimesheetFilters({ filters, onChange, className }: TimesheetFiltersProps) {
  const { year, month, week } = filters

  const totalWeeks = isoWeeksInYear(year)
  const weekOptions = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  function handleYearChange(v: string | number) {
    onChange({ year: Number(v), month, week: undefined })
  }

  function handleMonthChange(v: string | number) {
    onChange({ year, month: v ? Number(v) : undefined, week: undefined })
  }

  function handleWeekChange(v: string | number) {
    onChange({ year, month, week: v ? Number(v) : undefined })
  }

  function handleClear() {
    const now = new Date()
    onChange({ year: now.getFullYear(), month: now.getMonth() + 1, week: undefined })
  }

  const isFiltered =
    year !== currentYear ||
    month !== undefined ||
    week !== undefined

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}>
      {/* ── Year ──────────────────────────────────────── */}
      <div className="w-24">
        <AppSelect
          value={year}
          onChange={handleYearChange}
          options={YEAR_OPTIONS.map((y) => ({ value: y, label: String(y) }))}
          isSearchable={false}
          size="sm"
        />
      </div>

      {/* ── Month ─────────────────────────────────────── */}
      <div className="w-36">
        <AppSelect
          value={month ?? ''}
          onChange={handleMonthChange}
          options={[{ value: '', label: 'All Months' }, ...MONTHS.map((name, idx) => ({ value: idx + 1, label: name }))]}
          placeholder="All Months"
          isSearchable={false}
          size="sm"
        />
      </div>

      {/* ── Week ──────────────────────────────────────── */}
      <div className="w-52">
        <AppSelect
          value={week ?? ''}
          onChange={handleWeekChange}
          options={[
            { value: '', label: 'All Weeks' },
            ...weekOptions.map((w) => {
              const monday = isoWeekMonday(year, w)
              const sunday = new Date(monday)
              sunday.setDate(monday.getDate() + 6)
              return { value: w, label: `Week ${w} (${formatShort(monday)} – ${formatShort(sunday)})` }
            }),
          ]}
          placeholder="All Weeks"
          isSearchable={false}
          size="sm"
        />
      </div>

      {/* ── Clear ─────────────────────────────────────── */}
      {isFiltered && (
        <button
          onClick={handleClear}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  )
}
