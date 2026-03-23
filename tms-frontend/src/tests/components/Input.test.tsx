import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with placeholder text', () => {
    render(<Input placeholder="Enter your email" />)
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
  })

  it('accepts and displays a value', () => {
    render(<Input defaultValue="test@company.com" readOnly />)
    expect(screen.getByDisplayValue('test@company.com')).toBeInTheDocument()
  })

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    await user.type(screen.getByRole('textbox'), 'hello')
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders as password input when type="password"', () => {
    const { container } = render(<Input type="password" />)
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('renders as email input when type="email"', () => {
    const { container } = render(<Input type="email" />)
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument()
  })

  it('is disabled when the disabled prop is set', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('applies error styles when error prop is true', () => {
    render(<Input error />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-destructive')
  })

  it('does not apply error styles when error prop is false', () => {
    render(<Input error={false} />)
    const input = screen.getByRole('textbox')
    expect(input.className).not.toContain('border-destructive')
  })

  it('merges custom className', () => {
    render(<Input className="custom-input-class" />)
    expect(screen.getByRole('textbox').className).toContain('custom-input-class')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('has id when id prop is provided', () => {
    render(<Input id="email-field" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'email-field')
  })
})
