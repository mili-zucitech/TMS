import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimesheetFilters } from '@/modules/timesheets/components/TimesheetFilters'
import type { TimesheetFilterParams } from '@/modules/timesheets/types/timesheet.types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function makeFilters(overrides: Partial<{ year: number } & TimesheetFilterParams> = {}) {
  return { year: 2026, ...overrides }
}

describe('TimesheetFilters', () => {
  let onChange: Mock

  beforeEach(() => {
    onChange = vi.fn()
  })

  it('renders year, month and week selects', () => {
    render(<TimesheetFilters filters={makeFilters()} onChange={onChange} />)

    expect(screen.getByRole('combobox', { name: /filter by year/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /filter by month/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /filter by week/i })).toBeInTheDocument()
  })

  it('year select displays available year options', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2026 })} onChange={onChange} />)
    const yearSelect = screen.getByRole('combobox', { name: /filter by year/i })
    expect(yearSelect).toHaveValue('2026')
    // Options include at least the current and prior years
    expect(yearSelect.querySelectorAll('option').length).toBeGreaterThanOrEqual(2)
  })

  it('month select shows "All Months" as first option', () => {
    render(<TimesheetFilters filters={makeFilters()} onChange={onChange} />)
    const monthSelect = screen.getByRole('combobox', { name: /filter by month/i })
    expect(monthSelect.querySelector('option')?.textContent).toBe('All Months')
  })

  it('month select lists all 12 months', () => {
    render(<TimesheetFilters filters={makeFilters()} onChange={onChange} />)
    const monthSelect = screen.getByRole('combobox', { name: /filter by month/i })
    MONTH_NAMES.forEach((name) => {
      expect(monthSelect).toHaveTextContent(name)
    })
  })

  it('week select shows "All Weeks" as first option', () => {
    render(<TimesheetFilters filters={makeFilters()} onChange={onChange} />)
    const weekSelect = screen.getByRole('combobox', { name: /filter by week/i })
    expect(weekSelect.querySelector('option')?.textContent).toBe('All Weeks')
  })

  it('changing year calls onChange with new year and clears week', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2026, month: 3, week: 13 })} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter by year/i }), {
      target: { value: '2025' },
    })
    expect(onChange).toHaveBeenCalledWith({ year: 2025, month: 3, week: undefined })
  })

  it('changing month calls onChange with new month and clears week', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2026, month: 3, week: 13 })} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter by month/i }), {
      target: { value: '5' },
    })
    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 5, week: undefined })
  })

  it('selecting "All Months" passes month as undefined', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2026, month: 3 })} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter by month/i }), {
      target: { value: '' },
    })
    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: undefined, week: undefined })
  })

  it('changing week calls onChange with the selected week number', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2026 })} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter by week/i }), {
      target: { value: '13' },
    })
    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: undefined, week: 13 })
  })

  it('selecting "All Weeks" passes week as undefined', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2026, week: 13 })} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter by week/i }), {
      target: { value: '' },
    })
    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: undefined, week: undefined })
  })

  it('does not show Reset button when no custom filter is active', () => {
    // year = currentYear, no month, no week → not considered "filtered"
    const now = new Date()
    render(<TimesheetFilters filters={makeFilters({ year: now.getFullYear() })} onChange={onChange} />)
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
  })

  it('shows Reset button when year differs from current year', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2024 })} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('clicking Reset restores defaults to current year + current month', () => {
    const now = new Date()
    render(<TimesheetFilters filters={makeFilters({ year: 2024, month: 6 })} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onChange).toHaveBeenCalledWith({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      week: undefined,
    })
  })

  it('week dropdown options include date range labels', () => {
    render(<TimesheetFilters filters={makeFilters({ year: 2026 })} onChange={onChange} />)
    const weekSelect = screen.getByRole('combobox', { name: /filter by week/i })
    // Week 1 option should contain "Week 1"
    expect(weekSelect).toHaveTextContent('Week 1')
  })
})
