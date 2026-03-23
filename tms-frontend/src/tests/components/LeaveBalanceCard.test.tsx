import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaveBalanceCard } from '@/modules/leaves/components/LeaveBalanceCard'
import type { LeaveBalanceResponse } from '@/modules/leaves/types/leave.types'

const mockBalances: LeaveBalanceResponse[] = [
  {
    id: 1,
    userId: 'user-001',
    leaveTypeId: 1,
    leaveTypeName: 'Annual Leave',
    year: 2024,
    totalAllocated: 20,
    usedLeaves: 5,
    remainingLeaves: 15,
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    userId: 'user-001',
    leaveTypeId: 2,
    leaveTypeName: 'Sick Leave',
    year: 2024,
    totalAllocated: 10,
    usedLeaves: 2,
    remainingLeaves: 8,
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

describe('LeaveBalanceCard', () => {
  describe('loading state', () => {
    it('renders skeleton cards when isLoading is true', () => {
      const { container } = render(
        <LeaveBalanceCard balances={[]} isLoading={true} />,
      )
      // Should render 4 pulsing skeleton divs
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBe(4)
    })

    it('does not show balance data while loading', () => {
      render(<LeaveBalanceCard balances={mockBalances} isLoading={true} />)
      expect(screen.queryByText('Annual Leave')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows "No leave balance data" message when balances is empty', () => {
      render(<LeaveBalanceCard balances={[]} isLoading={false} />)
      expect(
        screen.getByText(/No leave balance data available/i),
      ).toBeInTheDocument()
    })

    it('shows initialize button when onInitialize prop is provided', () => {
      const onInitialize = vi.fn()
      render(
        <LeaveBalanceCard
          balances={[]}
          isLoading={false}
          onInitialize={onInitialize}
        />,
      )
      expect(
        screen.getByRole('button', { name: /initialize/i }),
      ).toBeInTheDocument()
    })

    it('calls onInitialize when initialize button is clicked', async () => {
      const user = userEvent.setup()
      const onInitialize = vi.fn()
      render(
        <LeaveBalanceCard
          balances={[]}
          isLoading={false}
          onInitialize={onInitialize}
        />,
      )
      await user.click(screen.getByRole('button', { name: /initialize/i }))
      expect(onInitialize).toHaveBeenCalledTimes(1)
    })

    it('does not show initialize button when onInitialize is not provided', () => {
      render(<LeaveBalanceCard balances={[]} isLoading={false} />)
      expect(screen.queryByRole('button', { name: /initialize/i })).not.toBeInTheDocument()
    })

    it('disables the button and shows spinner when isInitializing is true', () => {
      const onInitialize = vi.fn()
      const { container } = render(
        <LeaveBalanceCard
          balances={[]}
          isLoading={false}
          onInitialize={onInitialize}
          isInitializing={true}
        />,
      )
      // When loading=true, Button disables itself and shows a spinner
      const btn = container.querySelector('button[disabled]')
      expect(btn).toBeInTheDocument()
      expect(btn).toBeDisabled()
      expect(container.querySelector('svg.animate-spin')).toBeInTheDocument()
    })
  })

  describe('data state', () => {
    it('renders leave type names', () => {
      render(<LeaveBalanceCard balances={mockBalances} isLoading={false} />)
      expect(screen.getByText('Annual Leave')).toBeInTheDocument()
      expect(screen.getByText('Sick Leave')).toBeInTheDocument()
    })

    it('renders the totalAllocated days', () => {
      render(<LeaveBalanceCard balances={mockBalances} isLoading={false} />)
      // totalAllocated is rendered as "/ 20 days" in the card
      expect(screen.getByText('/ 20 days')).toBeInTheDocument()
    })

    it('renders the remainingLeaves days', () => {
      render(<LeaveBalanceCard balances={mockBalances} isLoading={false} />)
      // remainingLeaves is the large bold number in the card
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('renders a grid layout container', () => {
      const { container } = render(
        <LeaveBalanceCard balances={mockBalances} isLoading={false} />,
      )
      const grid = container.firstChild as HTMLElement
      expect(grid?.className).toContain('grid')
    })

    it('renders one card per balance entry', () => {
      const { container } = render(
        <LeaveBalanceCard balances={mockBalances} isLoading={false} />,
      )
      // Each balance gets its own card div inside the grid
      const grid = container.firstChild as HTMLElement
      expect(grid?.children.length).toBe(2)
    })
  })
})
