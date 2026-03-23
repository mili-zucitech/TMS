import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimesheetStatusBadge } from '@/modules/timesheets/components/TimesheetStatusBadge'
import type { TimesheetStatus } from '@/modules/timesheets/types/timesheet.types'

describe('TimesheetStatusBadge', () => {
  const cases: Array<{ status: TimesheetStatus; label: string; colorHint: string }> = [
    { status: 'DRAFT', label: 'Draft', colorHint: 'text-slate-600' },
    { status: 'SUBMITTED', label: 'Submitted', colorHint: 'text-blue-700' },
    { status: 'APPROVED', label: 'Approved', colorHint: 'text-emerald-700' },
    { status: 'REJECTED', label: 'Rejected', colorHint: 'text-red-700' },
    { status: 'LOCKED', label: 'Locked', colorHint: 'text-violet-700' },
  ]

  cases.forEach(({ status, label, colorHint }) => {
    it(`renders "${label}" for status "${status}"`, () => {
      render(<TimesheetStatusBadge status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })

    it(`applies correct color class for status "${status}"`, () => {
      render(<TimesheetStatusBadge status={status} />)
      const badge = screen.getByText(label)
      expect(badge.className).toContain(colorHint)
    })
  })

  it('renders as an inline-flex span', () => {
    const { container } = render(<TimesheetStatusBadge status="DRAFT" />)
    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
    expect(span?.className).toContain('inline-flex')
    expect(span?.className).toContain('rounded-full')
  })

  it('merges custom className', () => {
    render(<TimesheetStatusBadge status="DRAFT" className="custom-class" />)
    const badge = screen.getByText('Draft')
    expect(badge.className).toContain('custom-class')
  })

  it('falls back gracefully for an unknown status', () => {
    // Type-cast to simulate a runtime unknown value
    render(<TimesheetStatusBadge status={'UNKNOWN' as TimesheetStatus} />)
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument()
  })
})
