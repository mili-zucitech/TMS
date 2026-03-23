import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Submit</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Submit</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('is disabled when the disabled prop is true', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading is true', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows "Signing in…" text when loading is true', () => {
    render(<Button loading>Sign in</Button>)
    expect(screen.getByText('Signing in…')).toBeInTheDocument()
    // Original children are replaced by loading indicator
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('renders a spinner svg when loading', () => {
    const { container } = render(<Button loading>Save</Button>)
    const svg = container.querySelector('svg.animate-spin')
    expect(svg).toBeInTheDocument()
  })

  it('applies variant classes — destructive', () => {
    render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-destructive')
  })

  it('applies variant classes — outline', () => {
    render(<Button variant="outline">Outline</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border')
    expect(btn.className).toContain('bg-background')
  })

  it('applies size classes — sm', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-9')
  })

  it('applies size classes — lg', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-11')
  })

  it('applies size classes — icon', () => {
    render(<Button size="icon" aria-label="icon-btn">🔍</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-10')
    expect(btn.className).toContain('w-10')
  })

  it('merges custom className', () => {
    render(<Button className="my-custom-class">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('my-custom-class')
  })

  it('passes through arbitrary html props', () => {
    render(<Button data-testid="special-btn" type="submit">Submit</Button>)
    const btn = screen.getByTestId('special-btn')
    expect(btn).toHaveAttribute('type', 'submit')
  })

  it('has no loading indicator when loading is false', () => {
    const { container } = render(<Button loading={false}>Normal</Button>)
    expect(container.querySelector('svg.animate-spin')).not.toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
  })
})
